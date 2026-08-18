export type CoverageStatus = "live" | "planned";

export interface IndiaJurisdiction {
  name: string;
  kind: "state" | "union-territory";
  status: CoverageStatus;
  nameTe?: string;
  route?: string;
}

export const indiaJurisdictions: IndiaJurisdiction[] = [
  {
    name: "Andaman and Nicobar Islands",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Andhra Pradesh",
    nameTe: "ఆంధ్రప్రదేశ్",
    kind: "state",
    status: "live",
    route: "/government-explorer",
  },
  {
    name: "Arunachal Pradesh",
    kind: "state",
    status: "live",
    route: "/geographies",
  },
  { name: "Assam", kind: "state", status: "live", route: "/geographies" },
  { name: "Bihar", kind: "state", status: "live", route: "/geographies" },
  {
    name: "Chandigarh",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Chhattisgarh",
    kind: "state",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Delhi",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  { name: "Goa", kind: "state", status: "live", route: "/geographies" },
  { name: "Gujarat", kind: "state", status: "live", route: "/geographies" },
  { name: "Haryana", kind: "state", status: "live", route: "/geographies" },
  {
    name: "Himachal Pradesh",
    kind: "state",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Jammu and Kashmir",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  { name: "Jharkhand", kind: "state", status: "live", route: "/geographies" },
  { name: "Karnataka", kind: "state", status: "live", route: "/geographies" },
  { name: "Kerala", kind: "state", status: "live", route: "/geographies" },
  {
    name: "Ladakh",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Lakshadweep",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  {
    name: "Madhya Pradesh",
    kind: "state",
    status: "live",
    route: "/geographies",
  },
  { name: "Maharashtra", kind: "state", status: "live", route: "/geographies" },
  { name: "Manipur", kind: "state", status: "live", route: "/geographies" },
  { name: "Meghalaya", kind: "state", status: "live", route: "/geographies" },
  { name: "Mizoram", kind: "state", status: "live", route: "/geographies" },
  { name: "Nagaland", kind: "state", status: "live", route: "/geographies" },
  { name: "Odisha", kind: "state", status: "live", route: "/geographies" },
  {
    name: "Puducherry",
    kind: "union-territory",
    status: "live",
    route: "/geographies",
  },
  { name: "Punjab", kind: "state", status: "live", route: "/geographies" },
  { name: "Rajasthan", kind: "state", status: "live", route: "/geographies" },
  { name: "Sikkim", kind: "state", status: "live", route: "/geographies" },
  { name: "Tamil Nadu", kind: "state", status: "live", route: "/geographies" },
  { name: "Telangana", kind: "state", status: "live", route: "/geographies" },
  { name: "Tripura", kind: "state", status: "live", route: "/geographies" },
  {
    name: "Uttar Pradesh",
    kind: "state",
    status: "live",
    route: "/geographies",
  },
  { name: "Uttarakhand", kind: "state", status: "live", route: "/geographies" },
  { name: "West Bengal", kind: "state", status: "live", route: "/geographies" },
];

export const sectors = [
  "Health",
  "Education",
  "Agriculture",
  "Roads and transport",
  "Housing",
  "Water",
  "Energy",
  "Local government",
  "Social welfare",
] as const;

export const platformCoverage = {
  jurisdictionsStructured: indiaJurisdictions.length,
  sectorsStructured: sectors.length,
  liveStateDatasets: indiaJurisdictions.filter((item) => item.status === "live")
    .length,
  reviewedDistrictBaseline: 784,
  liveObservations: 50612,
  liveSchemes: 20,
  budgetYears: "2014–2026",
} as const;
