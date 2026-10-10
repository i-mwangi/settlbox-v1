pragma solidity 0.8.30;

contract SettlboxGiftEscrow {
    struct Gift {
        address sender;
        address recipient;
        uint256 amount;
        uint64 expiresAt;
        uint8 status;
    }

    mapping(bytes32 => Gift) public gifts;
    bool private entered;

    event GiftCreated(bytes32 indexed id, address indexed sender, address indexed recipient, uint256 amount, uint64 expiresAt);
    event GiftClaimed(bytes32 indexed id);
    event GiftRefunded(bytes32 indexed id);

    error InvalidGift();
    error Unauthorized();
    error TransferFailed();

    modifier nonReentrant() {
        if (entered) revert Unauthorized();
        entered = true;
        _;
        entered = false;
    }

    function createGift(bytes32 id, address recipient, uint64 expiresAt) external payable nonReentrant {
        if (id == bytes32(0) || gifts[id].sender != address(0) || recipient == address(0) || msg.value == 0 || expiresAt <= block.timestamp) revert InvalidGift();
        gifts[id] = Gift(msg.sender, recipient, msg.value, expiresAt, 1);
        emit GiftCreated(id, msg.sender, recipient, msg.value, expiresAt);
    }

    function claimGift(bytes32 id) external nonReentrant {
        Gift storage gift = gifts[id];
        if (gift.status != 1 || block.timestamp >= gift.expiresAt) revert InvalidGift();
        if (msg.sender != gift.recipient) revert Unauthorized();
        gift.status = 2;
        (bool success,) = gift.recipient.call{value: gift.amount}("");
        if (!success) revert TransferFailed();
        emit GiftClaimed(id);
    }

    function refundGift(bytes32 id) external nonReentrant {
        Gift storage gift = gifts[id];
        if (gift.status != 1 || block.timestamp < gift.expiresAt) revert InvalidGift();
        if (msg.sender != gift.sender) revert Unauthorized();
        gift.status = 3;
        (bool success,) = gift.sender.call{value: gift.amount}("");
        if (!success) revert TransferFailed();
        emit GiftRefunded(id);
    }
}
