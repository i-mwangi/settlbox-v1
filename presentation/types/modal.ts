import SelectTokenModal from "@/presentation/components/Modal/SelectTokenModal";
import EditTransactionModal from "@/presentation/components/Modal/EditTransactionModal";
import SelectEmployeeModal from "@/presentation/components/Modal/Contact/SelecteEmployeeModal";
import SelectClientModal from "@/presentation/components/Modal/Contact/SelectClientModal";
import SetupModulesModal from "@/presentation/components/Modal/SetupModulesModal";
import TransactionDetailModal from "@/presentation/components/Modal/Transactions/TransactionDetailModal";
import CreateNewGroupModal from "@/presentation/components/Modal/Group/CreateNewGroupModal";
import NewRequestModal from "@/presentation/components/Modal/NewRequestModal";
import CreateCustomQRModal from "@/presentation/components/Modal/CreateCustomQRModal";
import Portfolio from "@/presentation/components/Portfolio/Portfolio";
import OnboardingModal from "@/presentation/components/Modal/OnboardingModal";
import ConnectWalletModal from "@/presentation/components/Modal/ConnectWallet/ConnectWalletModal";
import TransactionOverviewModal from "@/presentation/components/Modal/TransactionOverviewModal";
import Notification from "@/presentation/components/Notification/Notification";
import BatchTransactionOverviewModal from "@/presentation/components/Modal/Batch/BatchTransactionOverviewModal";
import BatchTransactionsModal from "@/presentation/components/Modal/Batch/BatchTransactionsModal";
import GroupLinkModal from "@/presentation/components/Modal/Group/GroupLinkModal";
import GiftTransactionOverviewModal from "@/presentation/components/Modal/Gift/GiftTransactionOverviewModal";
import GiftSharingModal from "@/presentation/components/Modal/Gift/GiftSharingModal";
import GenerateGiftModal from "@/presentation/components/Modal/Gift/GenerateGiftModal";
import ValidatingModal from "@/presentation/components/Modal/ValidatingModal";
import SuccessModal from "@/presentation/components/Modal/Status/SuccessModal";
import FailModal from "@/presentation/components/Modal/Status/FailModal";
import DeleteGroupModal from "@/presentation/components/Modal/Group/DeleteGroupModal";
import EditGroupModal from "@/presentation/components/Modal/Group/EditGroupModal";
import ResetAccountModal from "@/presentation/components/Modal/Wallet/ResetAccountModal";
import DatePickerModal from "@/presentation/components/Modal/Date/DatePickerModal";
import SetupSchedulePaymentModal from "@/presentation/components/Modal/SchedulePayment/SetupSchedulePaymentModal";
import RecurringTransferModal from "@/presentation/components/Modal/SchedulePayment/RecurringTransferModal";
import RecurringTransferDetail from "@/presentation/components/Modal/SchedulePayment/RecurringTransferDetail";
import CancelPayment from "@/presentation/components/Modal/SchedulePayment/CancelPayment";
import CancelSchedule from "@/presentation/components/Modal/SchedulePayment/CancelSchedule";
import SchedulePaymentSidebar from "@/presentation/components/SchedulePayment/SchedulePaymentSidebar";
import DateFilterSidebar from "@/presentation/components/Home/DateFilterSidebar";
import RemoveSchedulePayment from "@/presentation/components/Modal/SchedulePayment/RemoveSchedulePayment";
import InteractAccountTransactionModal from "@/presentation/components/Modal/InteractAccountTransactionModal";
import SelectWalletModal from "@/presentation/components/Modal/Wallet/SelectWalletModal";
import CreateImportWalletModal from "@/presentation/components/Modal/Wallet/CreateImportWalletModal";
import ProcessingTransactionModal from "@/presentation/components/Modal/ProcessingTransactionModal";
import CreateWalletModal from "@/presentation/components/Modal/Wallet/CreateWalletModal";
import ImportWalletModal from "@/presentation/components/Modal/Wallet/ImportWalletModal";
import RemoveTransactionConfirmationModal from "@/presentation/components/Modal/Batch/RemoveTransactionConfirmationModal";
import CreateGroupModal from "@/presentation/components/Modal/Contact/CreateGroupModal";
import CreateEmployeeContactModal from "@/presentation/components/Modal/Contact/CreateEmployeeContactModal";
import CreateClientContactModal from "@/presentation/components/Modal/Contact/CreateClientContactModal";
import EditEmployeeContactModal from "@/presentation/components/Modal/Contact/EditEmployeeContactModal";
import EditClientContactModal from "@/presentation/components/Modal/Contact/EditClientContactModal";
import RemoveContactConfirmationModal from "@/presentation/components/Modal/Contact/RemoveContactConfirmationModal";
import BonusAmountModal from "@/presentation/components/Modal/Payroll/BonusAmountModal";
import PayrollPreviewModal from "@/presentation/components/Modal/Payroll/PayrollPreviewModal";
import RetryModal from "@/presentation/components/Modal/RetryModal";
import SelectNetworkModal from "@/presentation/components/Modal/SelectNetworkModal";
import InvoiceModal from "@/presentation/components/Modal/Invoice/InvoiceModal";
import RemoveInvoiceModal from "@/presentation/components/Modal/Invoice/RemoveInvoiceModal";
import ConnectArcWallet from "@/presentation/components/Modal/Wallet/ConnectArcWallet";
import RemovePayrollModal from "@/presentation/components/Modal/Payroll/RemovePayrollModal";
import ConfirmAndReviewInvoiceModal from "@/presentation/components/Modal/Invoice/ConfirmAndReviewInvoiceModal";
import PayInvoiceConfirmModal from "@/presentation/components/Modal/Invoice/PayInvoiceConfirmModal";
import DiscardChangesModal from "@/presentation/components/Modal/Common/DiscardChangesModal";
import ChooseContactTypeModal from "@/presentation/components/Modal/Contact/ChooseContactTypeModal";
import CreateAccountModal from "@/presentation/components/Modal/Account/CreateAccountModal";
import AddMemberModal from "@/presentation/components/Modal/Account/AddMemberModal";
import DepositModal from "@/presentation/components/Modal/DepositModal";
import InviteTeamMember from "@/presentation/components/Modal/TeamMember/InviteTeamMember";
import RemoveTeamMember from "@/presentation/components/Modal/TeamMember/RemoveTeamMember";
import EditTeamMember from "@/presentation/components/Modal/TeamMember/EditTeamMember";
import ChooseAccountModal from "@/presentation/components/Modal/Account/ChooseAccountModal";
import ReviewPlanModal from "@/presentation/components/Modal/ReviewPlanModal";
import PermissionRequiredModal from "@/presentation/components/Modal/PermissionRequiredModal";
import PayrollNotSavedModal from "@/presentation/components/Modal/Payroll/PayrollNotSavedModal";
import PayrollSimulationModal from "@/presentation/components/Modal/Payroll/PayrollSimulationModal";
import DeleteCompanyModal from "@/presentation/components/Modal/Company/DeleteCompanyModal";
import CreateEntityModal from "@/presentation/components/Modal/Entity/CreateEntityModal";
import { Group } from "./group-payment";
import { CompanyGroupResponseDto, CompanyContactResponseDto } from "@/presentation/types/dto/employee";
import { BatchTransaction } from "@/presentation/services/store/batchTransactions";
import { AssetWithMetadata } from "./faucet";
import { DateRange } from "react-day-picker";
import { SchedulePaymentFrequency } from "./schedule-payment";
import { TransactionStatus } from "./transaction";
import { ClientResponseDto } from "@/presentation/types/dto/client";
import { TokenDto } from "@/presentation/types/dto/token";
import { NetworkDto } from "@/presentation/types/dto/network";
import { MultisigAccountResponseDto } from "@/presentation/types/dto/multisig";
export const MODAL_IDS = {
    SELECT_TOKEN: "SELECT_TOKEN",
    EDIT_TRANSACTION: "EDIT_TRANSACTION",
    SELECT_EMPLOYEE: "SELECT_EMPLOYEE",
    SELECT_CLIENT: "SELECT_CLIENT",
    MODULES_SETUP: "MODULES_SETUP",
    TRANSACTION_DETAIL: "TRANSACTION_DETAIL",
    CREATE_NEW_GROUP: "CREATE_NEW_GROUP",
    NEW_REQUEST: "NEW_REQUEST",
    CREATE_CUSTOM_QR: "CREATE_CUSTOM_QR",
    PORTFOLIO: "PORTFOLIO",
    ONBOARDING: "ONBOARDING",
    CONNECT_WALLET: "CONNECT_WALLET",
    TRANSACTION_OVERVIEW: "TRANSACTION_OVERVIEW",
    GIFT_TRANSACTION_OVERVIEW: "GIFT_TRANSACTION_OVERVIEW",
    IMPORT_WALLET: "IMPORT_WALLET",
    BATCH_TRANSACTION_OVERVIEW: "BATCH_TRANSACTION_OVERVIEW",
    NOTIFICATION: "NOTIFICATION",
    BATCH_TRANSACTIONS: "BATCH_TRANSACTIONS",
    GROUP_LINK: "GROUP_LINK",
    GIFT_SHARING: "GIFT_SHARING",
    GENERATE_GIFT: "GENERATE_GIFT",
    VALIDATING: "VALIDATING",
    SUCCESS: "SUCCESS",
    FAIL: "FAIL",
    DELETE_GROUP: "DELETE_GROUP",
    EDIT_GROUP: "EDIT_GROUP",
    RESET_ACCOUNT: "RESET_ACCOUNT",
    DATE_PICKER: "DATE_PICKER",
    SETUP_SCHEDULE_PAYMENT: "SETUP_SCHEDULE_PAYMENT",
    RECURRING_TRANSFER: "RECURRING_TRANSFER",
    RECURRING_TRANSFER_DETAIL: "RECURRING_TRANSFER_DETAIL",
    CANCEL_PAYMENT: "CANCEL_PAYMENT",
    CANCEL_SCHEDULE: "CANCEL_SCHEDULE",
    REMOVE_SCHEDULE_PAYMENT: "REMOVE_SCHEDULE_PAYMENT",
    SCHEDULE_PAYMENT_SIDEBAR: "SCHEDULE_PAYMENT_SIDEBAR",
    DATE_FILTER: "DATE_FILTER",
    TRANSACTION_FILTER: "TRANSACTION_FILTER",
    INTERACT_ACCOUNT_TRANSACTION: "INTERACT_ACCOUNT_TRANSACTION",
    SELECT_WALLET: "SELECT_WALLET",
    CREATE_IMPORT_WALLET: "CREATE_IMPORT_WALLET",
    PROCESSING_TRANSACTION: "PROCESSING_TRANSACTION",
    CREATE_WALLET: "CREATE_WALLET",
    REMOVE_TRANSACTION_CONFIRMATION: "REMOVE_TRANSACTION_CONFIRMATION",
    CREATE_GROUP: "CREATE_GROUP",
    CREATE_EMPLOYEE_CONTACT: "CREATE_EMPLOYEE_CONTACT",
    CREATE_CLIENT_CONTACT: "CREATE_CLIENT_CONTACT",
    EDIT_EMPLOYEE_CONTACT: "EDIT_EMPLOYEE_CONTACT",
    EDIT_CLIENT_CONTACT: "EDIT_CLIENT_CONTACT",
    REMOVE_CONTACT_CONFIRMATION: "REMOVE_CONTACT_CONFIRMATION",
    BONUS_AMOUNT: "BONUS_AMOUNT",
    PAYROLL_PREVIEW: "PAYROLL_PREVIEW",
    RETRY: "RETRY",
    SELECT_NETWORK: "SELECT_NETWORK",
    INVOICE_MODAL: "INVOICE_MODAL",
    CONNECT_ARC_WALLET: "CONNECT_ARC_WALLET",
    REMOVE_PAYROLL: "REMOVE_PAYROLL",
    REMOVE_INVOICE: "REMOVE_INVOICE",
    CONFIRM_AND_REVIEW_INVOICE: "CONFIRM_AND_REVIEW_INVOICE",
    PAY_INVOICE_CONFIRM: "PAY_INVOICE_CONFIRM",
    DISCARD_CHANGES: "DISCARD_CHANGES",
    CHOOSE_CONTACT_TYPE: "CHOOSE_CONTACT_TYPE",
    CREATE_ACCOUNT: "CREATE_ACCOUNT",
    ADD_MEMBER: "ADD_MEMBER",
    DEPOSIT: "DEPOSIT",
    INVITE_TEAM_MEMBER: "INVITE_TEAM_MEMBER",
    REMOVE_TEAM_MEMBER: "REMOVE_TEAM_MEMBER",
    EDIT_TEAM_MEMBER: "EDIT_TEAM_MEMBER",
    PERMISSION_REQUIRED: "PERMISSION_REQUIRED",
    CHOOSE_ACCOUNT: "CHOOSE_ACCOUNT",
    REVIEW_PLAN: "REVIEW_PLAN",
    PAYROLL_NOT_SAVED: "PAYROLL_NOT_SAVED",
    PAYROLL_SIMULATION: "PAYROLL_SIMULATION",
    DELETE_COMPANY: "DELETE_COMPANY",
    CREATE_ENTITY: "CREATE_ENTITY",
} as const;
export type ModalId = keyof typeof MODAL_IDS;
export interface BaseModalProps {
    onClose: () => void;
    zIndex?: number;
}
export interface SelectTokenModalProps extends BaseModalProps {
    onTokenSelect?: (token: AssetWithMetadata | null) => void;
}
export interface EditTransactionModalProps extends BaseModalProps {
    pendingRequestId: number;
    transactionId: string;
    recipient?: string;
    recipientName?: string;
    amount?: string;
    message?: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    isPrivate?: boolean;
    recallableTime?: number;
    onSaveChanges?: (updatedData: {
        amount: string;
        recipient: string;
        message: string;
        isPrivate: boolean;
        recallableTime: number;
    }) => void;
}
export interface SelectEmployeeModalProps extends BaseModalProps {
    onSave?: (employee: CompanyContactResponseDto) => void;
}
export interface SelectClientModalProps extends BaseModalProps {
    onSave?: (client: ClientResponseDto) => void;
}
export interface ModulesSetupProps extends BaseModalProps {
    whitelistingEnabled?: boolean;
    onWhitelistingChange?: (enabled: boolean) => void;
    onRemoveSigner?: (id: number) => void;
    onAddNewAddress?: () => void;
    onCancel?: () => void;
    onSave?: () => void;
}
export interface TransactionDetailModalProps extends BaseModalProps {
    proposalId: number | string;
}
export interface CreateNewGroupModalProps extends BaseModalProps {
}
export interface NewRequestModalProps extends BaseModalProps {
    recipient?: string;
}
export interface CreateCustomQRModalProps extends BaseModalProps {
}
export interface PortfolioModalProps extends BaseModalProps {
}
export interface OnboardingModalProps extends BaseModalProps {
}
export interface ConnectWalletModalProps extends BaseModalProps {
}
export interface TransactionOverviewModalProps extends BaseModalProps {
    amount?: string;
    accountName?: string;
    accountAddress?: string;
    recipientName?: string;
    recipientAddress?: string;
    transactionType?: string;
    cancellableTime?: string;
    message?: string;
    onConfirm?: () => void;
    tokenAddress?: string;
    tokenSymbol?: string;
    schedulePayment?: {
        frequency: SchedulePaymentFrequency;
        times: number;
        startDate: Date;
    } | null;
    transactionHash?: string;
}
export interface BatchTransactionOverviewModalProps extends BaseModalProps {
    sender: string;
    transactions: BatchTransaction[];
    onConfirm?: () => Promise<void>;
}
export interface ImportWalletModalProps extends BaseModalProps {
}
export interface BatchTransactionsModalProps extends BaseModalProps {
}
export interface NotificationModalProps extends BaseModalProps {
}
export interface GroupLinkModalProps extends BaseModalProps {
    link: string;
}
export interface DatePickerModalProps extends BaseModalProps {
    defaultSelected?: Date;
    onSelect?: (date: Date | undefined) => void;
}
export interface DateFilterModalProps extends BaseModalProps {
    defaultSelected?: DateRange;
    onSelect?: (date: DateRange | undefined) => void;
}
export interface SetupSchedulePaymentModalProps extends BaseModalProps {
    schedulePayment: {
        frequency: SchedulePaymentFrequency;
        times: number;
        startDate?: Date;
    } | null;
    onSave: (data: {
        frequency: SchedulePaymentFrequency;
        times: number;
    }) => void;
}
export interface GiftTransactionOverviewModalProps extends BaseModalProps {
    amount?: string;
    accountAddress?: string;
    transactionType?: string;
    cancellableTime?: string;
    onConfirm?: () => void;
    tokenAddress?: string;
    tokenSymbol?: string;
}
export interface GiftSharingModalProps extends BaseModalProps {
    giftLink: string;
}
export interface GenerateGiftModalProps extends BaseModalProps {
    onGiftGeneration?: () => Promise<string>;
}
export interface ValidatingModalProps extends BaseModalProps {
}
export interface SuccessModalProps extends BaseModalProps {
}
export interface FailModalProps extends BaseModalProps {
    tryAgain?: () => Promise<void>;
}
export interface EditGroupModalProps extends BaseModalProps {
    group: Group & {
        memberAddressBooks: {
            address: string;
            name?: string;
        }[];
    };
}
export interface DeleteGroupModalProps extends BaseModalProps {
    groupName?: string;
    onDelete?: () => Promise<void> | void;
}
export interface ResetAccountModalProps extends BaseModalProps {
}
export interface RecurringTransferModalProps extends BaseModalProps {
}
export type RecurringTransferItem = {
    recipientName: string;
    amount: string;
    token: AssetWithMetadata;
    frequencyLabel: string;
    startDateLabel: string;
    timesLabel: string;
};
export type RecurringTransferTransaction = {
    amountLabel: string;
    claimableAfterLabel: string;
};
export interface RecurringTransferDetailProps extends BaseModalProps {
    item: RecurringTransferItem;
    transactions: RecurringTransferTransaction[];
}
export interface CancelPaymentProps extends BaseModalProps {
    onCancel?: () => Promise<void>;
}
export interface CancelScheduleProps extends BaseModalProps {
    onCancel?: () => Promise<void>;
}
export interface RemoveSchedulePaymentProps extends BaseModalProps {
    onConfirm?: () => Promise<void>;
}
export interface SchedulePaymentSidebarProps extends BaseModalProps {
    schedulePaymentData: {
        recipient: {
            address: string;
            avatar?: string;
            name?: string;
        };
        totalAmount: string;
        claimedAmount: string;
        currency: string;
        progress: number;
        claimProgress: number;
        transactions: Array<{
            id: string;
            noteId: string;
            date: string;
            status: TransactionStatus | "ready_to_claim";
            label: string;
            progress?: number;
            amount?: string;
            recallableTime: string;
        }>;
    };
}
export interface TransactionFilterModalProps extends BaseModalProps {
    hash: string;
}
export interface InteractAccountTransactionModalProps extends BaseModalProps {
    address: string;
}
export interface SelectWalletModalProps extends BaseModalProps {
}
export interface CreateImportWalletModalProps extends BaseModalProps {
}
export interface ProcessingTransactionModalProps extends BaseModalProps {
}
export interface CreateWalletModalProps extends BaseModalProps {
}
export interface RemoveTransactionConfirmationModalProps extends BaseModalProps {
    onRemove?: () => Promise<void>;
}
export interface CreateGroupModalProps extends BaseModalProps {
    onGroupCreated?: (group: CompanyGroupResponseDto) => void;
}
export interface CreateEmployeeContactModalProps extends BaseModalProps {
}
export interface CreateClientContactModalProps extends BaseModalProps {
}
export interface EditEmployeeContactModalProps extends BaseModalProps {
    contactData: {
        id: string;
        name: string;
        address: string;
        email?: string;
        group: string;
        groupIds?: number[];
        token?: TokenDto;
        network?: NetworkDto;
        avatar?: string;
    };
}
export interface EditClientContactModalProps extends BaseModalProps {
    clientData?: ClientResponseDto;
}
export interface RemoveContactConfirmationModalProps extends BaseModalProps {
    onRemove?: () => Promise<void>;
    contactName?: string;
    contactAddress?: string;
}
export interface BonusAmountModalProps extends BaseModalProps {
    monthlyBonusAmounts: {
        [key: string]: string;
    };
    onUpdateAmounts: (amounts: {
        [key: string]: string;
    }) => void;
    numberOfMonths: number;
    selectedTokenSymbol: string;
}
export interface PayrollPreviewModalProps extends BaseModalProps {
}
export interface RetryModalProps extends BaseModalProps {
    onRetry?: () => Promise<void>;
}
export interface SelectNetworkModalProps extends BaseModalProps {
    onNetworkSelect?: (network: {
        icon: string;
        name: string;
        value: string;
    }) => void;
}
export interface InvoiceModalProps extends BaseModalProps {
    onConfirm?: () => Promise<void>;
    invoice: {
        invoiceNumber: string;
        from: {
            name: string;
            company: string;
            address: string;
            email: string;
        };
        billTo: {
            name: string;
            company: string;
            address: string;
            email: string;
        };
        date: string;
        dueDate: string;
        network: string;
        paymentToken: {
            name: string;
        };
        currency: string;
        items: Array<{
            name: string;
            rate: number;
            qty: number;
            amount: number;
        }>;
        subtotal: number;
        tax: number;
        total: number;
        walletAddress: string;
        amountDue: string;
    };
}
export interface ConnectArcWalletProps extends BaseModalProps {
}
export interface RemovePayrollModalProps extends BaseModalProps {
    onRemove: () => Promise<void>;
    payrollOwnerName?: string;
    payrollId?: number;
}
export interface RemoveInvoiceModalProps extends BaseModalProps {
    onRemove: () => Promise<void>;
    invoiceOwnerName?: string;
}
export interface ConfirmAndReviewInvoiceModalProps extends BaseModalProps {
    onConfirm: () => Promise<void>;
}
export interface PayInvoiceConfirmModalProps extends BaseModalProps {
    invoice?: any;
    invoices?: any[];
    invoiceUUIDs?: string[];
    billUUID?: string;
}
export interface DiscardChangesModalProps extends BaseModalProps {
    onConfirm?: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
}
export interface ChooseContactTypeModalProps extends BaseModalProps {
    onContactTypeSelect: (type: "employee" | "client") => void;
}
export interface CreateEmployeeContactModalProps extends BaseModalProps {
}
export interface CreateClientContactModalProps extends BaseModalProps {
}
export interface CreateAccountModalProps extends BaseModalProps {
}
export interface AddMemberModalProps extends BaseModalProps {
    onMembersSelected?: (members: any[]) => void;
    selectedMembers?: any[];
}
export interface DepositModalProps extends BaseModalProps {
}
export interface InviteTeamMemberModalProps extends BaseModalProps {
}
export interface RemoveTeamMemberProps extends BaseModalProps {
    name: string;
    onRemove: () => Promise<void>;
}
export interface EditTeamMemberProps extends BaseModalProps {
    id: number;
}
export interface ChooseAccountModalProps extends BaseModalProps {
    onSelectAccount?: (account: MultisigAccountResponseDto) => void;
    onConfirm?: (account: MultisigAccountResponseDto) => void;
}
export interface ReviewPlanModalProps extends BaseModalProps {
}
export interface PermissionRequiredModalProps extends BaseModalProps {
    onConfirm?: () => void;
    role?: string;
}
export interface PayrollNotSavedModalProps extends BaseModalProps {
    onConfirm?: () => void;
}
export interface PayrollSimulationModalProps extends BaseModalProps {
    treasuryBalance: number;
    avgMonthlyBurn: number;
    currentRunwayMonths: number;
    currentEmployees: {
        role: string;
        monthlyCost: number;
    }[];
    onApply: (employees: {
        role: string;
        monthlyCost: number;
    }[]) => void;
}
export interface DeleteCompanyModalProps extends BaseModalProps {
    onDelete: () => Promise<void>;
    companyName?: string;
}
export interface CreateEntityModalProps extends BaseModalProps {
}
export type ModalPropsMap = {
    [MODAL_IDS.SELECT_TOKEN]: SelectTokenModalProps;
    [MODAL_IDS.EDIT_TRANSACTION]: EditTransactionModalProps;
    [MODAL_IDS.SELECT_EMPLOYEE]: SelectEmployeeModalProps;
    [MODAL_IDS.MODULES_SETUP]: ModulesSetupProps;
    [MODAL_IDS.TRANSACTION_DETAIL]: TransactionDetailModalProps;
    [MODAL_IDS.CREATE_NEW_GROUP]: CreateNewGroupModalProps;
    [MODAL_IDS.NEW_REQUEST]: NewRequestModalProps;
    [MODAL_IDS.CREATE_CUSTOM_QR]: CreateCustomQRModalProps;
    [MODAL_IDS.PORTFOLIO]: PortfolioModalProps;
    [MODAL_IDS.ONBOARDING]: OnboardingModalProps;
    [MODAL_IDS.CONNECT_WALLET]: ConnectWalletModalProps;
    [MODAL_IDS.TRANSACTION_OVERVIEW]: TransactionOverviewModalProps;
    [MODAL_IDS.IMPORT_WALLET]: ImportWalletModalProps;
    [MODAL_IDS.BATCH_TRANSACTION_OVERVIEW]: BatchTransactionOverviewModalProps;
    [MODAL_IDS.NOTIFICATION]: NotificationModalProps;
    [MODAL_IDS.BATCH_TRANSACTIONS]: BatchTransactionsModalProps;
    [MODAL_IDS.GROUP_LINK]: GroupLinkModalProps;
    [MODAL_IDS.GIFT_TRANSACTION_OVERVIEW]: GiftTransactionOverviewModalProps;
    [MODAL_IDS.GIFT_SHARING]: GiftSharingModalProps;
    [MODAL_IDS.GENERATE_GIFT]: GenerateGiftModalProps;
    [MODAL_IDS.VALIDATING]: ValidatingModalProps;
    [MODAL_IDS.SUCCESS]: SuccessModalProps;
    [MODAL_IDS.FAIL]: FailModalProps;
    [MODAL_IDS.DELETE_GROUP]: DeleteGroupModalProps;
    [MODAL_IDS.EDIT_GROUP]: EditGroupModalProps;
    [MODAL_IDS.RESET_ACCOUNT]: ResetAccountModalProps;
    [MODAL_IDS.DATE_PICKER]: DatePickerModalProps;
    [MODAL_IDS.SETUP_SCHEDULE_PAYMENT]: SetupSchedulePaymentModalProps;
    [MODAL_IDS.RECURRING_TRANSFER]: RecurringTransferModalProps;
    [MODAL_IDS.RECURRING_TRANSFER_DETAIL]: RecurringTransferDetailProps;
    [MODAL_IDS.CANCEL_PAYMENT]: CancelPaymentProps;
    [MODAL_IDS.CANCEL_SCHEDULE]: CancelScheduleProps;
    [MODAL_IDS.SCHEDULE_PAYMENT_SIDEBAR]: SchedulePaymentSidebarProps;
    [MODAL_IDS.DATE_FILTER]: DateFilterModalProps;
    [MODAL_IDS.TRANSACTION_FILTER]: TransactionFilterModalProps;
    [MODAL_IDS.REMOVE_SCHEDULE_PAYMENT]: RemoveSchedulePaymentProps;
    [MODAL_IDS.INTERACT_ACCOUNT_TRANSACTION]: InteractAccountTransactionModalProps;
    [MODAL_IDS.SELECT_WALLET]: SelectWalletModalProps;
    [MODAL_IDS.CREATE_IMPORT_WALLET]: CreateImportWalletModalProps;
    [MODAL_IDS.PROCESSING_TRANSACTION]: ProcessingTransactionModalProps;
    [MODAL_IDS.CREATE_WALLET]: CreateWalletModalProps;
    [MODAL_IDS.CREATE_GROUP]: CreateGroupModalProps;
    [MODAL_IDS.CREATE_EMPLOYEE_CONTACT]: CreateEmployeeContactModalProps;
    [MODAL_IDS.CREATE_CLIENT_CONTACT]: CreateClientContactModalProps;
    [MODAL_IDS.EDIT_EMPLOYEE_CONTACT]: EditEmployeeContactModalProps;
    [MODAL_IDS.EDIT_CLIENT_CONTACT]: EditClientContactModalProps;
    [MODAL_IDS.REMOVE_CONTACT_CONFIRMATION]: RemoveContactConfirmationModalProps;
    [MODAL_IDS.BONUS_AMOUNT]: BonusAmountModalProps;
    [MODAL_IDS.PAYROLL_PREVIEW]: PayrollPreviewModalProps;
    [MODAL_IDS.RETRY]: RetryModalProps;
    [MODAL_IDS.SELECT_NETWORK]: SelectNetworkModalProps;
    [MODAL_IDS.INVOICE_MODAL]: InvoiceModalProps;
    [MODAL_IDS.CONNECT_ARC_WALLET]: ConnectArcWalletProps;
    [MODAL_IDS.REMOVE_PAYROLL]: RemovePayrollModalProps;
    [MODAL_IDS.REMOVE_INVOICE]: RemoveInvoiceModalProps;
    [MODAL_IDS.CONFIRM_AND_REVIEW_INVOICE]: ConfirmAndReviewInvoiceModalProps;
    [MODAL_IDS.PAY_INVOICE_CONFIRM]: PayInvoiceConfirmModalProps;
    [MODAL_IDS.DISCARD_CHANGES]: DiscardChangesModalProps;
    [MODAL_IDS.CHOOSE_CONTACT_TYPE]: ChooseContactTypeModalProps;
    [MODAL_IDS.CREATE_ACCOUNT]: CreateAccountModalProps;
    [MODAL_IDS.ADD_MEMBER]: AddMemberModalProps;
    [MODAL_IDS.DEPOSIT]: DepositModalProps;
    [MODAL_IDS.INVITE_TEAM_MEMBER]: InviteTeamMemberModalProps;
    [MODAL_IDS.REMOVE_TEAM_MEMBER]: RemoveTeamMemberProps;
    [MODAL_IDS.EDIT_TEAM_MEMBER]: EditTeamMemberProps;
    [MODAL_IDS.CHOOSE_ACCOUNT]: ChooseAccountModalProps;
    [MODAL_IDS.REVIEW_PLAN]: ReviewPlanModalProps;
    [MODAL_IDS.PERMISSION_REQUIRED]: PermissionRequiredModalProps;
    [MODAL_IDS.PAYROLL_NOT_SAVED]: PayrollNotSavedModalProps;
    [MODAL_IDS.PAYROLL_SIMULATION]: PayrollSimulationModalProps;
    [MODAL_IDS.DELETE_COMPANY]: DeleteCompanyModalProps;
    [MODAL_IDS.CREATE_ENTITY]: CreateEntityModalProps;
};
export type ModalProps = ModalPropsMap[keyof ModalPropsMap];
export const modalRegistry = {
    [MODAL_IDS.SELECT_TOKEN]: SelectTokenModal,
    [MODAL_IDS.EDIT_TRANSACTION]: EditTransactionModal,
    [MODAL_IDS.SELECT_EMPLOYEE]: SelectEmployeeModal,
    [MODAL_IDS.SELECT_CLIENT]: SelectClientModal,
    [MODAL_IDS.MODULES_SETUP]: SetupModulesModal,
    [MODAL_IDS.TRANSACTION_DETAIL]: TransactionDetailModal,
    [MODAL_IDS.CREATE_NEW_GROUP]: CreateNewGroupModal,
    [MODAL_IDS.NEW_REQUEST]: NewRequestModal,
    [MODAL_IDS.CREATE_CUSTOM_QR]: CreateCustomQRModal,
    [MODAL_IDS.PORTFOLIO]: Portfolio,
    [MODAL_IDS.ONBOARDING]: OnboardingModal,
    [MODAL_IDS.CONNECT_WALLET]: ConnectWalletModal,
    [MODAL_IDS.TRANSACTION_OVERVIEW]: TransactionOverviewModal,
    [MODAL_IDS.IMPORT_WALLET]: ImportWalletModal,
    [MODAL_IDS.BATCH_TRANSACTION_OVERVIEW]: BatchTransactionOverviewModal,
    [MODAL_IDS.NOTIFICATION]: Notification,
    [MODAL_IDS.BATCH_TRANSACTIONS]: BatchTransactionsModal,
    [MODAL_IDS.GROUP_LINK]: GroupLinkModal,
    [MODAL_IDS.GIFT_TRANSACTION_OVERVIEW]: GiftTransactionOverviewModal,
    [MODAL_IDS.GIFT_SHARING]: GiftSharingModal,
    [MODAL_IDS.GENERATE_GIFT]: GenerateGiftModal,
    [MODAL_IDS.VALIDATING]: ValidatingModal,
    [MODAL_IDS.SUCCESS]: SuccessModal,
    [MODAL_IDS.FAIL]: FailModal,
    [MODAL_IDS.DELETE_GROUP]: DeleteGroupModal,
    [MODAL_IDS.EDIT_GROUP]: EditGroupModal,
    [MODAL_IDS.RESET_ACCOUNT]: ResetAccountModal,
    [MODAL_IDS.DATE_PICKER]: DatePickerModal,
    [MODAL_IDS.SETUP_SCHEDULE_PAYMENT]: SetupSchedulePaymentModal,
    [MODAL_IDS.RECURRING_TRANSFER]: RecurringTransferModal,
    [MODAL_IDS.RECURRING_TRANSFER_DETAIL]: RecurringTransferDetail,
    [MODAL_IDS.CANCEL_PAYMENT]: CancelPayment,
    [MODAL_IDS.CANCEL_SCHEDULE]: CancelSchedule,
    [MODAL_IDS.SCHEDULE_PAYMENT_SIDEBAR]: SchedulePaymentSidebar,
    [MODAL_IDS.DATE_FILTER]: DateFilterSidebar,
    [MODAL_IDS.REMOVE_SCHEDULE_PAYMENT]: RemoveSchedulePayment,
    [MODAL_IDS.INTERACT_ACCOUNT_TRANSACTION]: InteractAccountTransactionModal,
    [MODAL_IDS.SELECT_WALLET]: SelectWalletModal,
    [MODAL_IDS.CREATE_IMPORT_WALLET]: CreateImportWalletModal,
    [MODAL_IDS.PROCESSING_TRANSACTION]: ProcessingTransactionModal,
    [MODAL_IDS.CREATE_WALLET]: CreateWalletModal,
    [MODAL_IDS.REMOVE_TRANSACTION_CONFIRMATION]: RemoveTransactionConfirmationModal,
    [MODAL_IDS.CREATE_GROUP]: CreateGroupModal,
    [MODAL_IDS.CREATE_EMPLOYEE_CONTACT]: CreateEmployeeContactModal,
    [MODAL_IDS.CREATE_CLIENT_CONTACT]: CreateClientContactModal,
    [MODAL_IDS.EDIT_EMPLOYEE_CONTACT]: EditEmployeeContactModal,
    [MODAL_IDS.EDIT_CLIENT_CONTACT]: EditClientContactModal,
    [MODAL_IDS.REMOVE_CONTACT_CONFIRMATION]: RemoveContactConfirmationModal,
    [MODAL_IDS.BONUS_AMOUNT]: BonusAmountModal,
    [MODAL_IDS.PAYROLL_PREVIEW]: PayrollPreviewModal,
    [MODAL_IDS.RETRY]: RetryModal,
    [MODAL_IDS.SELECT_NETWORK]: SelectNetworkModal,
    [MODAL_IDS.INVOICE_MODAL]: InvoiceModal,
    [MODAL_IDS.CONNECT_ARC_WALLET]: ConnectArcWallet,
    [MODAL_IDS.REMOVE_PAYROLL]: RemovePayrollModal,
    [MODAL_IDS.REMOVE_INVOICE]: RemoveInvoiceModal,
    [MODAL_IDS.CONFIRM_AND_REVIEW_INVOICE]: ConfirmAndReviewInvoiceModal,
    [MODAL_IDS.PAY_INVOICE_CONFIRM]: PayInvoiceConfirmModal,
    [MODAL_IDS.DISCARD_CHANGES]: DiscardChangesModal,
    [MODAL_IDS.CHOOSE_CONTACT_TYPE]: ChooseContactTypeModal,
    [MODAL_IDS.CREATE_ACCOUNT]: CreateAccountModal,
    [MODAL_IDS.ADD_MEMBER]: AddMemberModal,
    [MODAL_IDS.DEPOSIT]: DepositModal,
    [MODAL_IDS.INVITE_TEAM_MEMBER]: InviteTeamMember,
    [MODAL_IDS.REMOVE_TEAM_MEMBER]: RemoveTeamMember,
    [MODAL_IDS.EDIT_TEAM_MEMBER]: EditTeamMember,
    [MODAL_IDS.CHOOSE_ACCOUNT]: ChooseAccountModal,
    [MODAL_IDS.REVIEW_PLAN]: ReviewPlanModal,
    [MODAL_IDS.PERMISSION_REQUIRED]: PermissionRequiredModal,
    [MODAL_IDS.PAYROLL_NOT_SAVED]: PayrollNotSavedModal,
    [MODAL_IDS.PAYROLL_SIMULATION]: PayrollSimulationModal,
    [MODAL_IDS.DELETE_COMPANY]: DeleteCompanyModal,
    [MODAL_IDS.CREATE_ENTITY]: CreateEntityModal,
} as const;
