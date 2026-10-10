import type { DemoAccount, DemoPaymentLink, DemoProposal, DemoCompany } from "@/presentation/contexts/DemoProvider";
import type { MultisigAccountResponseDto, MultisigProposalResponseDto } from "@/presentation/types/dto/multisig";
import type { PaymentLinkResponseDto } from "@/presentation/types/dto/payment-link";
import { PaymentLinkStatusEnum } from "@/presentation/types/enums";
import { USDC_TOKEN_HEX_ADDRESS } from "@/presentation/services/utils/constant";
import type { DemoTeamMember } from "@/presentation/contexts/DemoProvider";
import type { TeamMemberResponseDto } from "@/presentation/types/dto/team-member";
import { TeamMemberRoleEnum, TeamMemberStatusEnum } from "@/presentation/types/enums";
export function demoTeamMember(member: DemoTeamMember): TeamMemberResponseDto & Pick<DemoTeamMember, "email" | "salary" | "walletAddress"> {
    const role = Object.values(TeamMemberRoleEnum).find(role => role === member.role) || TeamMemberRoleEnum.VIEWER;
    const status = Object.values(TeamMemberStatusEnum).find(status => status === member.status) || TeamMemberStatusEnum.ACTIVE;
    return { ...member, role, status, profilePicture: member.profilePicture || undefined, companyId: 1, createdAt: member.joinedAt, updatedAt: member.joinedAt, user: { id: member.id, email: member.email, publicKey: member.walletAddress, commitment: member.walletAddress } };
}
export function demoAccount(account: DemoAccount, index = 0): MultisigAccountResponseDto & Pick<DemoAccount, "members" | "thresholdControl"> {
    return { ...account, id: index + 1, uuid: account.uuid || account.accountId, logo: account.logo || undefined, publicKeys: account.publicKeys || account.members.map(member => member.commitment), updatedAt: account.createdAt };
}
export function demoProposal(proposal: DemoProposal, index = 0): MultisigProposalResponseDto & {
    proposalCategory: string;
} {
    return { ...proposal, id: index + 1, description: proposal.label, proposalType: proposal.type === "CONFIG" ? "CONFIG" : "SEND", proposalCategory: proposal.proposalCategory || "paying_bill", summaryCommitment: "", summaryBytesHex: "", requestBytesHex: "", signaturesCount: proposal.signatures.length, threshold: proposal.requiredSignatures, tokens: proposal.amount > 0 ? [{ address: USDC_TOKEN_HEX_ADDRESS, symbol: "USDC", decimals: 6, name: "USDC", amount: String(Math.round(proposal.amount * 1e6)) }] : [], signatures: proposal.signatures.map((signature, position) => ({ id: position + 1, uuid: `${proposal.uuid}-${position}`, approverIndex: position, approverPublicKey: signature.signer, signatureHex: "", createdAt: signature.signedAt })), noteIds: [], recipientId: proposal.toAddress, faucetId: USDC_TOKEN_HEX_ADDRESS, amount: String(proposal.amount), updatedAt: proposal.createdAt };
}
export function demoPaymentLink(link: DemoPaymentLink, company?: DemoCompany): PaymentLinkResponseDto {
    return { ...link, amount: link.amount === null ? "" : String(link.amount), paymentWalletAddress: link.recipientAddress, status: link.status === "ACTIVE" ? PaymentLinkStatusEnum.ACTIVE : PaymentLinkStatusEnum.DEACTIVATED, order: link.id, company: { companyName: company?.companyName || "Demo company", companyLogo: company?.logo || undefined }, updatedAt: link.createdAt, acceptedTokens: [{ address: USDC_TOKEN_HEX_ADDRESS, symbol: "USDC", decimals: 6, name: "USDC" }], acceptedChains: [{ chainId: 5042002, name: "Arc Testnet" }], records: [] };
}
