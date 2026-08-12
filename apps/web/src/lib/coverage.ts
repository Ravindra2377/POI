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
    status: "planned",
  },
  {
    name: "Andhra Pradesh",
    nameTe: "ఆంధ్రప్రదేశ్",
    kind: "state",
    status: "live",
    route: "/government-explorer",
  },
  { name: "Arunachal Pradesh", kind: "state", status: "planned" },
  { name: "Assam", kind: "state", status: "planned" },
  { name: "Bihar", kind: "state", status: "planned" },
  { name: "Chandigarh", kind: "union-territory", status: "planned" },
  { name: "Chhattisgarh", kind: "state", status: "planned" },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    kind: "union-territory",
    status: "planned",
  },
  { name: "Delhi", kind: "union-territory", status: "planned" },
  { name: "Goa", kind: "state", status: "planned" },
  { name: "Gujarat", kind: "state", status: "planned" },
  { name: "Haryana", kind: "state", status: "planned" },
  { name: "Himachal Pradesh", kind: "state", status: "planned" },
  { name: "Jammu and Kashmir", kind: "union-territory", status: "planned" },
  { name: "Jharkhand", kind: "state", status: "planned" },
  { name: "Karnataka", kind: "state", status: "planned" },
  { name: "Kerala", kind: "state", status: "planned" },
  { name: "Ladakh", kind: "union-territory", status: "planned" },
  { name: "Lakshadweep", kind: "union-territory", status: "planned" },
  { name: "Madhya Pradesh", kind: "state", status: "planned" },
  { name: "Maharashtra", kind: "state", status: "planned" },
  { name: "Manipur", kind: "state", status: "planned" },
  { name: "Meghalaya", kind: "state", status: "planned" },
  { name: "Mizoram", kind: "state", status: "planned" },
  { name: "Nagaland", kind: "state", status: "planned" },
  { name: "Odisha", kind: "state", status: "planned" },
  { name: "Puducherry", kind: "union-territory", status: "planned" },
  { name: "Punjab", kind: "state", status: "planned" },
  { name: "Rajasthan", kind: "state", status: "planned" },
  { name: "Sikkim", kind: "state", status: "planned" },
  { name: "Tamil Nadu", kind: "state", status: "planned" },
  { name: "Telangana", kind: "state", status: "planned" },
  { name: "Tripura", kind: "state", status: "planned" },
  { name: "Uttar Pradesh", kind: "state", status: "planned" },
  { name: "Uttarakhand", kind: "state", status: "planned" },
  { name: "West Bengal", kind: "state", status: "planned" },
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
  reviewedDistrictBaseline: 26,
} as const;
