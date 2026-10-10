import { sendBatchTransaction, sendSingleTransaction } from "@/presentation/services/api/transaction";
import { SendTransactionDto } from "@/presentation/types/transaction";
import { useMutation } from "@tanstack/react-query";
const useSendSingleTransaction = () => {
    return useMutation({
        mutationFn: async (transaction: SendTransactionDto) => {
            const response = await sendSingleTransaction(transaction);
            return response;
        },
    });
};
const useSendBatchTransaction = () => {
    return useMutation({
        mutationFn: async (transaction: SendTransactionDto[]) => {
            const response = await sendBatchTransaction(transaction);
            return response;
        },
    });
};
export { useSendSingleTransaction, useSendBatchTransaction };
