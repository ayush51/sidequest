// Must match the dmv_area enum in the database.
export const areaOptions = [
	{ value: "georgetown", label: "Georgetown" },
	{ value: "national_mall", label: "National Mall" },
	{ value: "old_town_alexandria", label: "Old Town Alexandria" },
	{ value: "eastern_market", label: "Eastern Market" },
	{ value: "great_falls", label: "Great Falls" },
	{ value: "capital_crescent_trail", label: "Capital Crescent Trail" },
	{ value: "u_street", label: "U Street" },
	{ value: "shirlington", label: "Shirlington" },
	{ value: "dc_other", label: "DC" },
	{ value: "maryland_other", label: "Maryland" },
	{ value: "virginia_other", label: "Virginia" },
	{ value: "anywhere", label: "Anywhere" },
] as const;

export const areaLabel = (area: string) =>
	areaOptions.find((a) => a.value === area)?.label ?? area.replaceAll("_", " ");
