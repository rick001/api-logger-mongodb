"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagedRules = getManagedRules;
const RULES = [
    {
        id: 'sqli-basic',
        name: 'Basic SQLi Pattern',
        category: 'sqli',
        targets: ['url', 'query', 'params', 'body'],
        pattern: /(\bunion\b.*\bselect\b|\bor\b\s+1=1|--|\bdrop\s+table\b|\binformation_schema\b)/i,
        score: 35,
        action: 'soft-block'
    },
    {
        id: 'xss-script-tag',
        name: 'XSS Script Tag',
        category: 'xss',
        targets: ['url', 'query', 'params', 'body'],
        pattern: /<\s*script[\s>]|javascript:\s*|onerror\s*=|onload\s*=/i,
        score: 40,
        action: 'soft-block'
    },
    {
        id: 'path-traversal',
        name: 'Path Traversal Pattern',
        category: 'path-traversal',
        targets: ['url', 'query', 'params'],
        pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i,
        score: 45,
        action: 'soft-block'
    },
    {
        id: 'command-injection',
        name: 'Command Injection Pattern',
        category: 'command-injection',
        targets: ['url', 'query', 'params', 'body'],
        pattern: /(;|\|\||&&|\$\(|`)\s*(cat|ls|curl|wget|sh|bash|powershell|cmd)\b/i,
        score: 50,
        action: 'block'
    },
    {
        id: 'bad-method-override',
        name: 'Suspicious Method Override',
        category: 'protocol-anomaly',
        targets: ['headers'],
        pattern: /x-http-method-override\s*:\s*(trace|connect|track)/i,
        score: 20,
        action: 'log'
    },
    {
        id: 'user-agent-scanner',
        name: 'Suspicious Scanner User-Agent',
        category: 'protocol-anomaly',
        targets: ['userAgent'],
        pattern: /(sqlmap|nikto|nmap|acunetix|dirbuster|masscan|zgrab)/i,
        score: 35,
        action: 'soft-block'
    }
];
function getManagedRules(options) {
    const includeSet = new Set(options?.includeCategories || []);
    const excludeSet = new Set(options?.excludeRuleIds || []);
    return RULES.filter((rule) => {
        if (excludeSet.has(rule.id)) {
            return false;
        }
        if (includeSet.size === 0) {
            return true;
        }
        return includeSet.has(rule.category);
    }).map((rule) => ({
        ...rule,
        tags: [...(rule.tags || []), rule.category]
    }));
}
//# sourceMappingURL=managed-rules.js.map