export const formatNumberWithCommas = (num: number | string | null | undefined, decimals: number = 4, showApproximateZero: boolean = false): string => {
    try {
        if (num === null || num === undefined || num === "")
            return "0";
        const parsedNum = typeof num === "string" ? parseFloat(num) : num;
        if (parsedNum === undefined || isNaN(parsedNum) || !isFinite(parsedNum))
            return "0";
        const fixedNum = parsedNum.toFixed(decimals);
        const [integerPart, decimalPart] = fixedNum.split(".");
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (decimalPart) {
            if (decimals === 2) {
                return `${formattedInteger}.${decimalPart}`;
            }
            const trimmedDecimal = decimalPart.replace(/0+$/, "");
            if (trimmedDecimal === "") {
                return formattedInteger;
            }
            return `${formattedInteger}.${trimmedDecimal}`;
        }
        if (parsedNum !== 0 && Math.abs(parsedNum) < Math.pow(10, -decimals)) {
            return showApproximateZero ? "~0" : "0";
        }
        return formattedInteger;
    }
    catch (error) {
        return "0";
    }
};
