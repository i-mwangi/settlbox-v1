export enum PostHogEvent {
    USER_LOGGED_IN = "user_logged_in",
    USER_LOGGED_OUT = "user_logged_out",
    COMPANY_CREATED = "company_created",
    COMPANY_LOGO_UPLOADED = "company_logo_uploaded",
    WALLET_CONNECTED = "wallet_connected",
    WALLET_DISCONNECTED = "wallet_disconnected",
    TRANSACTION_INITIATED = "transaction_initiated",
    TRANSACTION_SENT = "transaction_sent",
    TRANSACTION_ADDED_TO_BATCH = "transaction_added_to_batch",
    QUICK_SEND_TRANSACTION_SENT = "quick_send_transaction_sent",
    SCHEDULED_PAYMENT_CREATED = "scheduled_payment_created",
    BATCH_TRANSACTION_SENT = "batch_transaction_sent",
    BATCH_TRANSACTION_REMOVED = "batch_transaction_removed",
    INVOICE_CREATED = "invoice_created",
    INVOICE_DELETED = "invoice_deleted",
    INVOICE_VOIDED = "invoice_voided",
    INVOICE_PAID = "invoice_paid",
    BILL_PAY_INITIATED = "bill_pay_initiated",
    BILL_CANCELLED = "bill_cancelled",
    BILL_PROPOSAL_CREATED = "bill_proposal_created",
    PAYROLL_CREATED = "payroll_created",
    PAYROLL_UPDATED = "payroll_updated",
    PAYROLL_DELETED = "payroll_deleted",
    PAYMENT_LINK_CREATED = "payment_link_created",
    PAYMENT_LINK_UPDATED = "payment_link_updated",
    PAYMENT_LINK_TOGGLED = "payment_link_toggled",
    PAYMENT_LINK_DELETED = "payment_link_deleted",
    TEAM_MEMBER_INVITED = "team_member_invited",
    TEAM_MEMBERS_BULK_INVITED = "team_members_bulk_invited",
    TEAM_MEMBER_REMOVED = "team_member_removed",
    TEAM_INVITE_ACCEPTED = "team_invite_accepted",
    PROPOSAL_SIGNED = "proposal_signed",
    PROPOSAL_EXECUTED = "proposal_executed",
    PROPOSAL_CANCELLED = "proposal_cancelled",
    PROPOSAL_APPROVED = "proposal_approved",
    PROPOSAL_REJECTED = "proposal_rejected",
    CONTACT_CREATED = "contact_created",
    CONTACT_UPDATED = "contact_updated",
    CONTACT_DELETED = "contact_deleted",
    SETTINGS_UPDATED = "settings_updated"
}
export interface PostHogEventProperties {
    [PostHogEvent.USER_LOGGED_IN]: {
        method?: string;
    };
    [PostHogEvent.USER_LOGGED_OUT]: Record<string, never>;
    [PostHogEvent.COMPANY_CREATED]: {
        companyName?: string;
    };
    [PostHogEvent.COMPANY_LOGO_UPLOADED]: Record<string, never>;
    [PostHogEvent.WALLET_CONNECTED]: {
        address?: string;
    };
    [PostHogEvent.WALLET_DISCONNECTED]: Record<string, never>;
    [PostHogEvent.TRANSACTION_INITIATED]: {
        amount?: string;
        token?: string;
        recipientType?: string;
    };
    [PostHogEvent.TRANSACTION_SENT]: {
        amount?: string;
        token?: string;
        transactionId?: string;
    };
    [PostHogEvent.TRANSACTION_ADDED_TO_BATCH]: {
        amount?: string;
        token?: string;
    };
    [PostHogEvent.QUICK_SEND_TRANSACTION_SENT]: {
        amount?: string;
        token?: string;
    };
    [PostHogEvent.SCHEDULED_PAYMENT_CREATED]: {
        frequency?: string;
        amount?: string;
        token?: string;
    };
    [PostHogEvent.BATCH_TRANSACTION_SENT]: {
        count?: number;
        totalAmount?: string;
    };
    [PostHogEvent.BATCH_TRANSACTION_REMOVED]: {
        index?: number;
    };
    [PostHogEvent.INVOICE_CREATED]: {
        amount?: string;
        currency?: string;
        clientId?: string;
    };
    [PostHogEvent.INVOICE_DELETED]: {
        invoiceId?: string;
    };
    [PostHogEvent.INVOICE_VOIDED]: {
        invoiceId?: string;
    };
    [PostHogEvent.INVOICE_PAID]: {
        invoiceId?: string;
        amount?: string;
    };
    [PostHogEvent.BILL_PAY_INITIATED]: {
        billId?: string;
    };
    [PostHogEvent.BILL_CANCELLED]: {
        billId?: string;
    };
    [PostHogEvent.BILL_PROPOSAL_CREATED]: {
        billId?: string;
        amount?: string;
    };
    [PostHogEvent.PAYROLL_CREATED]: {
        employeeCount?: number;
        totalAmount?: string;
    };
    [PostHogEvent.PAYROLL_UPDATED]: {
        payrollId?: string;
    };
    [PostHogEvent.PAYROLL_DELETED]: {
        payrollId?: string;
    };
    [PostHogEvent.PAYMENT_LINK_CREATED]: {
        amount?: string;
        token?: string;
    };
    [PostHogEvent.PAYMENT_LINK_UPDATED]: {
        linkId?: string;
    };
    [PostHogEvent.PAYMENT_LINK_TOGGLED]: {
        linkId?: string;
        active?: boolean;
    };
    [PostHogEvent.PAYMENT_LINK_DELETED]: {
        linkId?: string;
    };
    [PostHogEvent.TEAM_MEMBER_INVITED]: {
        email?: string;
        role?: string;
    };
    [PostHogEvent.TEAM_MEMBERS_BULK_INVITED]: {
        count?: number;
    };
    [PostHogEvent.TEAM_MEMBER_REMOVED]: {
        memberId?: string;
    };
    [PostHogEvent.TEAM_INVITE_ACCEPTED]: Record<string, never>;
    [PostHogEvent.PROPOSAL_SIGNED]: {
        proposalId?: string;
    };
    [PostHogEvent.PROPOSAL_EXECUTED]: {
        proposalId?: string;
        transactionId?: string;
    };
    [PostHogEvent.PROPOSAL_CANCELLED]: {
        proposalId?: string;
    };
    [PostHogEvent.PROPOSAL_APPROVED]: {
        proposalId?: string;
    };
    [PostHogEvent.PROPOSAL_REJECTED]: {
        proposalId?: string;
    };
    [PostHogEvent.CONTACT_CREATED]: Record<string, never>;
    [PostHogEvent.CONTACT_UPDATED]: Record<string, never>;
    [PostHogEvent.CONTACT_DELETED]: Record<string, never>;
    [PostHogEvent.SETTINGS_UPDATED]: {
        setting?: string;
    };
}
