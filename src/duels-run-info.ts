export interface DuelsRunInfo {
	readonly adventureType: 'duels' | 'paid-duels';
	readonly creationTimestamp: number;
	readonly reviewId: string;
	readonly runId: string;
	readonly bundleType: BundleType;
	readonly option1: string;
	readonly option1Contents: readonly string[];
	readonly option2: string;
	readonly option2Contents: readonly string[];
	readonly option3: string;
	readonly option3Contents: readonly string[];
	readonly chosenOptionIndex: number;
	readonly wins: number;
	readonly losses: number;
	readonly rating: number;
}

export type BundleType = 'hero-power' | 'treasure' | 'signature-treasure' | 'loot';
