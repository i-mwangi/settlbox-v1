pragma solidity 0.8.30;

contract SettlboxTreasuryVault {
    struct Policy {
        uint256 paymentLimit;
        uint256 dailyLimit;
        uint256 lifetimeLimit;
        uint256 approvalThreshold;
        uint256 liquidityFloor;
        uint32 requiredApprovals;
    }
    struct Payment {
        address recipient;
        uint256 amount;
        uint64 expiresAt;
        uint64 policyVersion;
        uint32 approvals;
        uint8 status;
    }

    address public owner;
    address public pendingOwner;
    address public executor;
    Policy public policy;
    uint64 public policyVersion = 1;
    bool public paused = true;
    bool private entered;
    uint256 public lifetimeSpent;
    uint32 public approverCount;
    mapping(address => bool) public recipients;
    mapping(address => bool) public approvers;
    mapping(uint256 => uint256) public dailySpent;
    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => mapping(address => bool)) public approvedBy;

    event Deposited(address indexed sender, uint256 amount);
    event PolicyChanged(uint64 indexed version);
    event ExecutorChanged(address indexed executor);
    event RecipientChanged(address indexed recipient, bool allowed);
    event ApproverChanged(address indexed approver, bool allowed);
    event PauseChanged(bool paused);
    event OwnershipProposed(address indexed owner);
    event OwnershipTransferred(address indexed owner);
    event PaymentQueued(bytes32 indexed id, address indexed recipient, uint256 amount, uint64 expiresAt, uint64 policyVersion);
    event PaymentApproved(bytes32 indexed id, address indexed approver);
    event PaymentCancelled(bytes32 indexed id);
    event PaymentExecuted(bytes32 indexed id, address indexed recipient, uint256 amount);
    event Recovered(address indexed recipient, uint256 amount);

    error Unauthorized();
    error InvalidPolicy();
    error InvalidPayment();
    error PolicyRejected();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    modifier nonReentrant() {
        if (entered) revert Unauthorized();
        entered = true;
        _;
        entered = false;
    }

    constructor(address administrator, address executionWallet, Policy memory initialPolicy) {
        if (administrator == address(0) || executionWallet == address(0) || administrator == executionWallet) revert Unauthorized();
        owner = administrator;
        executor = executionWallet;
        _validatePolicy(initialPolicy);
        policy = initialPolicy;
    }

    receive() external payable { emit Deposited(msg.sender, msg.value); }

    function _validatePolicy(Policy memory value) private pure {
        if (value.paymentLimit == 0 || value.paymentLimit > value.dailyLimit || value.dailyLimit > value.lifetimeLimit || value.approvalThreshold > value.paymentLimit || value.requiredApprovals == 0 || value.requiredApprovals > 20) revert InvalidPolicy();
    }
    function setPolicy(Policy calldata value) external onlyOwner {
        _validatePolicy(value);
        if (value.lifetimeLimit < lifetimeSpent) revert InvalidPolicy();
        policy = value;
        emit PolicyChanged(++policyVersion);
    }
    function setExecutor(address value) external onlyOwner {
        if (value == address(0) || value == owner || value == pendingOwner || approvers[value]) revert Unauthorized();
        executor = value;
        emit PolicyChanged(++policyVersion);
        emit ExecutorChanged(value);
    }
    function setRecipient(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0) || recipient == address(this)) revert InvalidPayment();
        recipients[recipient] = allowed;
        emit PolicyChanged(++policyVersion);
        emit RecipientChanged(recipient, allowed);
    }
    function setApprover(address approver, bool allowed) external onlyOwner {
        if (approver == address(0) || approver == executor) revert Unauthorized();
        if (approvers[approver] == allowed) return;
        approvers[approver] = allowed;
        if (allowed) ++approverCount; else --approverCount;
        emit PolicyChanged(++policyVersion);
        emit ApproverChanged(approver, allowed);
    }
    function setPaused(bool value) external onlyOwner {
        if (!value && approverCount < policy.requiredApprovals) revert InvalidPolicy();
        paused = value;
        emit PolicyChanged(++policyVersion);
        emit PauseChanged(value);
    }
    function proposeOwner(address value) external onlyOwner {
        if (value == address(0) || value == executor) revert Unauthorized();
        pendingOwner = value;
        emit OwnershipProposed(value);
    }
    function acceptOwnership() external {
        if (msg.sender != pendingOwner || msg.sender == executor) revert Unauthorized();
        owner = pendingOwner;
        pendingOwner = address(0);
        emit PolicyChanged(++policyVersion);
        emit OwnershipTransferred(owner);
    }

    function queuePayment(bytes32 id, address recipient, uint256 amount, uint64 expiresAt) external {
        if (msg.sender != executor) revert Unauthorized();
        if (paused || !recipients[recipient] || amount == 0 || amount > policy.paymentLimit) revert PolicyRejected();
        if (id == bytes32(0) || payments[id].status != 0 || expiresAt <= block.timestamp || uint256(expiresAt) > block.timestamp + 30 days) revert InvalidPayment();
        payments[id] = Payment(recipient, amount, expiresAt, policyVersion, 0, 1);
        emit PaymentQueued(id, recipient, amount, expiresAt, policyVersion);
    }
    function approvePayment(bytes32 id) external {
        if (!approvers[msg.sender] || msg.sender == executor) revert Unauthorized();
        Payment storage payment = payments[id];
        if (paused || payment.status != 1 || payment.expiresAt <= block.timestamp || payment.policyVersion != policyVersion || approvedBy[id][msg.sender]) revert InvalidPayment();
        approvedBy[id][msg.sender] = true;
        ++payment.approvals;
        emit PaymentApproved(id, msg.sender);
    }
    function cancelPayment(bytes32 id) external onlyOwner {
        if (payments[id].status != 1) revert InvalidPayment();
        payments[id].status = 3;
        emit PaymentCancelled(id);
    }
    function executePayment(bytes32 id) external nonReentrant {
        if (msg.sender != executor) revert Unauthorized();
        Payment storage payment = payments[id];
        Policy memory limits = policy;
        if (paused || payment.status != 1 || payment.expiresAt <= block.timestamp || payment.policyVersion != policyVersion) revert InvalidPayment();
        uint256 amount = payment.amount;
        if (!recipients[payment.recipient] || amount > limits.paymentLimit || (amount > limits.approvalThreshold && payment.approvals < limits.requiredApprovals)) revert PolicyRejected();
        uint256 day = block.timestamp / 1 days;
        if (dailySpent[day] + amount > limits.dailyLimit || lifetimeSpent + amount > limits.lifetimeLimit || address(this).balance < amount || address(this).balance - amount < limits.liquidityFloor) revert PolicyRejected();
        payment.status = 2;
        dailySpent[day] += amount;
        lifetimeSpent += amount;
        (bool success,) = payment.recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit PaymentExecuted(id, payment.recipient, amount);
    }
    function recover(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        if (!paused || recipient == address(0) || recipient == address(this) || amount == 0) revert PolicyRejected();
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Recovered(recipient, amount);
    }
}
