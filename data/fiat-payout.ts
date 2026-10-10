export type PaymentRail = "local" | "ach" | "sepa" | "fps" | "swift";

export interface Bank {
  code: string;
  name: string;
}

export interface FiatCountry {
  code: string;
  name: string;
  currency: string;
  currencyCode: string;
  rail: PaymentRail;
  banks: Bank[];
  icon: string;
}

export const FIAT_COUNTRIES: FiatCountry[] = [
  // Southeast Asia - local rails
  {
    code: "VN",
    name: "Vietnam",
    currency: "Vietnamese Dong",
    currencyCode: "VND",
    rail: "local",
    icon: "/flag/vn.svg",
    banks: [
      { code: "VCB", name: "Vietcombank" },
      { code: "TCB", name: "Techcombank" },
      { code: "MBB", name: "MB Bank" },
      { code: "BIDV", name: "BIDV" },
      { code: "VPB", name: "VPBank" },
      { code: "ACB", name: "ACB" },
      { code: "TPB", name: "TPBank" },
      { code: "STB", name: "Sacombank" },
      { code: "VIB", name: "VIB" },
      { code: "HDB", name: "HDBank" },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    currency: "Singapore Dollar",
    currencyCode: "SGD",
    rail: "local",
    icon: "/flag/sg.svg",
    banks: [
      { code: "DBS", name: "DBS Bank" },
      { code: "OCBC", name: "OCBC Bank" },
      { code: "UOB", name: "UOB" },
      { code: "SC", name: "Standard Chartered" },
      { code: "HSBC", name: "HSBC" },
      { code: "CITI", name: "Citibank" },
    ],
  },
  {
    code: "MY",
    name: "Malaysia",
    currency: "Malaysian Ringgit",
    currencyCode: "MYR",
    rail: "local",
    icon: "/flag/my.svg",
    banks: [
      { code: "MBB", name: "Maybank" },
      { code: "CIMB", name: "CIMB Bank" },
      { code: "PBB", name: "Public Bank" },
      { code: "RHB", name: "RHB Bank" },
      { code: "HLB", name: "Hong Leong Bank" },
      { code: "AMB", name: "AmBank" },
    ],
  },
  {
    code: "ID",
    name: "Indonesia",
    currency: "Indonesian Rupiah",
    currencyCode: "IDR",
    rail: "local",
    icon: "/flag/id.svg",
    banks: [
      { code: "BCA", name: "Bank Central Asia (BCA)" },
      { code: "BRI", name: "Bank Rakyat Indonesia (BRI)" },
      { code: "MANDIRI", name: "Bank Mandiri" },
      { code: "BNI", name: "Bank Negara Indonesia (BNI)" },
      { code: "CIMB", name: "CIMB Niaga" },
      { code: "PERMATA", name: "Bank Permata" },
    ],
  },
  {
    code: "PH",
    name: "Philippines",
    currency: "Philippine Peso",
    currencyCode: "PHP",
    rail: "local",
    icon: "/flag/ph.svg",
    banks: [
      { code: "BDO", name: "BDO Unibank" },
      { code: "BPI", name: "Bank of the Philippine Islands" },
      { code: "METRO", name: "Metrobank" },
      { code: "UNION", name: "UnionBank" },
      { code: "RCBC", name: "RCBC" },
      { code: "LAND", name: "Landbank" },
      { code: "GCASH", name: "GCash" },
      { code: "MAYA", name: "Maya (PayMaya)" },
    ],
  },
  {
    code: "TH",
    name: "Thailand",
    currency: "Thai Baht",
    currencyCode: "THB",
    rail: "local",
    icon: "/flag/th.svg",
    banks: [
      { code: "BBL", name: "Bangkok Bank" },
      { code: "KBANK", name: "Kasikornbank" },
      { code: "SCB", name: "Siam Commercial Bank" },
      { code: "KTB", name: "Krungthai Bank" },
      { code: "TTB", name: "TMBThanachart Bank" },
      { code: "BAY", name: "Bank of Ayudhya (Krungsri)" },
    ],
  },
  {
    code: "CN",
    name: "China",
    currency: "Chinese Yuan",
    currencyCode: "CNY",
    rail: "local",
    icon: "/flag/cn.svg",
    banks: [
      { code: "ICBC", name: "ICBC" },
      { code: "CCB", name: "China Construction Bank" },
      { code: "ABC", name: "Agricultural Bank of China" },
      { code: "BOC", name: "Bank of China" },
      { code: "CMB", name: "China Merchants Bank" },
      { code: "BCM", name: "Bank of Communications" },
      { code: "PSBC", name: "Postal Savings Bank of China" },
    ],
  },

  // Europe - SEPA
  {
    code: "CH",
    name: "Switzerland",
    currency: "Swiss Franc",
    currencyCode: "CHF",
    rail: "sepa",
    icon: "/flag/ch.svg",
    banks: [
      { code: "UBS", name: "UBS" },
      { code: "ZKB", name: "Zurich Cantonal Bank" },
      { code: "RAIFFEISEN", name: "Raiffeisen Switzerland" },
      { code: "POSTFIN", name: "PostFinance" },
      { code: "JBAER", name: "Julius Baer" },
      { code: "SYGNUM", name: "Sygnum Bank" },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    currency: "Euro",
    currencyCode: "EUR",
    rail: "sepa",
    icon: "/flag/de.svg",
    banks: [
      { code: "COMMERZBANK", name: "Commerzbank" },
      { code: "DEUTSCHE", name: "Deutsche Bank" },
      { code: "SPARKASSE", name: "Sparkasse" },
      { code: "N26", name: "N26" },
      { code: "ING", name: "ING-DiBa" },
    ],
  },
  {
    code: "UA",
    name: "Ukraine",
    currency: "Ukrainian Hryvnia",
    currencyCode: "UAH",
    rail: "local",
    icon: "/flag/ua.svg",
    banks: [
      { code: "PRIVAT", name: "PrivatBank" },
      { code: "MONO", name: "Monobank" },
      { code: "OSCHAD", name: "Oschadbank" },
      { code: "UKRSIB", name: "UkrSibbank" },
      { code: "RAIFFEISEN", name: "Raiffeisen Bank Aval" },
    ],
  },
  {
    code: "PL",
    name: "Poland",
    currency: "Polish Zloty",
    currencyCode: "PLN",
    rail: "sepa",
    icon: "/flag/pl.svg",
    banks: [
      { code: "PKO", name: "PKO Bank Polski" },
      { code: "MBANK", name: "mBank" },
      { code: "ING", name: "ING Bank Slaski" },
      { code: "SANTANDER", name: "Santander Bank Polska" },
      { code: "PEKAO", name: "Bank Pekao" },
    ],
  },
  {
    code: "SI",
    name: "Slovenia",
    currency: "Euro",
    currencyCode: "EUR",
    rail: "sepa",
    icon: "/flag/si.svg",
    banks: [
      { code: "NLB", name: "NLB" },
      { code: "NOVA", name: "Nova KBM" },
      { code: "SKB", name: "SKB Banka" },
      { code: "INTESA", name: "Banka Intesa Sanpaolo" },
    ],
  },

  // US - ACH
  {
    code: "US",
    name: "United States",
    currency: "US Dollar",
    currencyCode: "USD",
    rail: "ach",
    icon: "/flag/us.svg",
    banks: [],
  },

  // UK - Faster Payments
  {
    code: "UK",
    name: "United Kingdom",
    currency: "British Pound",
    currencyCode: "GBP",
    rail: "fps",
    icon: "/flag/uk.svg",
    banks: [],
  },

  // Latin America - local rails
  {
    code: "MX",
    name: "Mexico",
    currency: "Mexican Peso",
    currencyCode: "MXN",
    rail: "local",
    icon: "/flag/mx.svg",
    banks: [
      { code: "BBVA", name: "BBVA Mexico" },
      { code: "BANAMEX", name: "Citibanamex" },
      { code: "BANORTE", name: "Banorte" },
      { code: "HSBC", name: "HSBC Mexico" },
      { code: "SANTANDER", name: "Santander Mexico" },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    currency: "Brazilian Real",
    currencyCode: "BRL",
    rail: "local",
    icon: "/flag/br.svg",
    banks: [
      { code: "BB", name: "Banco do Brasil" },
      { code: "ITAU", name: "Itau Unibanco" },
      { code: "BRADESCO", name: "Bradesco" },
      { code: "SANTANDER", name: "Santander Brasil" },
      { code: "CEF", name: "Caixa Economica Federal" },
      { code: "NUBANK", name: "Nubank" },
    ],
  },
  {
    code: "AR",
    name: "Argentina",
    currency: "Argentine Peso",
    currencyCode: "ARS",
    rail: "local",
    icon: "/flag/ar.svg",
    banks: [
      { code: "GALICIA", name: "Banco Galicia" },
      { code: "NACION", name: "Banco de la Nacion" },
      { code: "MACRO", name: "Banco Macro" },
      { code: "BBVA", name: "BBVA Argentina" },
      { code: "SANTANDER", name: "Santander Argentina" },
    ],
  },
  {
    code: "CO",
    name: "Colombia",
    currency: "Colombian Peso",
    currencyCode: "COP",
    rail: "local",
    icon: "/flag/co.svg",
    banks: [
      { code: "BANCOLOMBIA", name: "Bancolombia" },
      { code: "DAVIVIENDA", name: "Davivienda" },
      { code: "BOGOTA", name: "Banco de Bogota" },
      { code: "BBVA", name: "BBVA Colombia" },
    ],
  },

  // Africa - local rails
  {
    code: "NG",
    name: "Nigeria",
    currency: "Nigerian Naira",
    currencyCode: "NGN",
    rail: "local",
    icon: "/flag/ng.svg",
    banks: [
      { code: "GTB", name: "Guaranty Trust Bank" },
      { code: "ACCESS", name: "Access Bank" },
      { code: "ZENITH", name: "Zenith Bank" },
      { code: "FBN", name: "First Bank of Nigeria" },
      { code: "UBA", name: "United Bank for Africa" },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    currency: "Kenyan Shilling",
    currencyCode: "KES",
    rail: "local",
    icon: "/flag/ke.svg",
    banks: [
      { code: "KCB", name: "KCB Bank" },
      { code: "EQUITY", name: "Equity Bank" },
      { code: "COOP", name: "Co-operative Bank" },
      { code: "ABSA", name: "Absa Bank Kenya" },
      { code: "MPESA", name: "M-Pesa" },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    currency: "South African Rand",
    currencyCode: "ZAR",
    rail: "local",
    icon: "/flag/za.svg",
    banks: [
      { code: "FNB", name: "First National Bank" },
      { code: "ABSA", name: "Absa Group" },
      { code: "NEDBANK", name: "Nedbank" },
      { code: "STANDARD", name: "Standard Bank" },
      { code: "CAPITEC", name: "Capitec Bank" },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    currency: "Ghanaian Cedi",
    currencyCode: "GHS",
    rail: "local",
    icon: "/flag/gh.svg",
    banks: [
      { code: "GCB", name: "GCB Bank" },
      { code: "ECOBANK", name: "Ecobank Ghana" },
      { code: "STANBIC", name: "Stanbic Bank" },
      { code: "ABSA", name: "Absa Bank Ghana" },
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    currency: "Egyptian Pound",
    currencyCode: "EGP",
    rail: "local",
    icon: "/flag/eg.svg",
    banks: [
      { code: "NBE", name: "National Bank of Egypt" },
      { code: "CIB", name: "Commercial International Bank" },
      { code: "BANQUE", name: "Banque Misr" },
      { code: "QNB", name: "QNB Alahli" },
    ],
  },
];

/** Get rail-specific field labels */
export function getRailLabel(rail: PaymentRail) {
  switch (rail) {
    case "ach":
      return { primary: "Routing number", secondary: "Account number", placeholder1: "e.g. 021000021", placeholder2: "e.g. 1234567890" };
    case "fps":
      return { primary: "Sort code", secondary: "Account number", placeholder1: "e.g. 20-00-00", placeholder2: "e.g. 12345678" };
    case "sepa":
      return { primary: "IBAN", secondary: "BIC (optional)", placeholder1: "e.g. DE89370400440532013000", placeholder2: "Auto-derived from IBAN" };
    case "swift":
      return { primary: "SWIFT / BIC", secondary: "Account number", placeholder1: "e.g. DBSSSGSG", placeholder2: "e.g. 1234567890" };
    case "local":
    default:
      return { primary: "Account number", secondary: "", placeholder1: "e.g. 1234567890", placeholder2: "" };
  }
}
