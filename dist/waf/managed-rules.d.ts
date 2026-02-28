import { WafRule } from '../types';
export interface ManagedWafRule extends WafRule {
    category: string;
}
export declare function getManagedRules(options?: {
    includeCategories?: string[];
    excludeRuleIds?: string[];
}): WafRule[];
//# sourceMappingURL=managed-rules.d.ts.map