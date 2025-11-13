import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Check } from 'lucide-react';

// All available dynamic variables from the CRM system
const VARIABLE_CATEGORIES = {
  lead: {
    name: 'Lead Information',
    icon: '👤',
    variables: [
      { key: 'lead_name', description: 'Lead full name', example: 'John Smith' },
      { key: 'lead_email', description: 'Lead email address', example: 'john@example.com' },
      { key: 'lead_phone', description: 'Lead phone number', example: '+1234567890' },
      { key: 'lead_source', description: 'How lead was generated', example: 'lead_gen' },
      { key: 'lead_status', description: 'Current lead status', example: 'qualified' },
      { key: 'qualified', description: 'Is lead qualified', example: 'true/false' },
      { key: 'qualification_score', description: 'Lead score (0-100)', example: '85' },
      { key: 'estimated_value', description: 'Deal value estimate', example: '$5,000' },
      { key: 'assigned_to', description: 'Team member assigned', example: 'Sarah Johnson' },
    ]
  },
  company: {
    name: 'Company Information',
    icon: '🏢',
    variables: [
      { key: 'company_name', description: 'Your company name', example: 'ACME Construction' },
      { key: 'company', description: 'Lead company name', example: 'Smith Industries' },
      { key: 'company_phone', description: 'Your phone number', example: '+1234567890' },
      { key: 'company_email', description: 'Your email address', example: 'contact@acme.com' },
    ]
  },
  project: {
    name: 'Project/Job Information',
    icon: '🏗️',
    variables: [
      { key: 'project_name', description: 'Project title', example: 'Kitchen Renovation' },
      { key: 'project_type', description: 'Type of project', example: 'Residential Remodel' },
      { key: 'project_address', description: 'Job site address', example: '123 Main St' },
      { key: 'project_timeline', description: 'Project timeline', example: '2-3 weeks' },
      { key: 'budget_range', description: 'Project budget', example: '$10,000-$15,000' },
      { key: 'timeline', description: 'Start to finish time', example: '30 days' },
    ]
  },
  location: {
    name: 'Address Information',
    icon: '📍',
    variables: [
      { key: 'address', description: 'Full street address', example: '123 Main Street' },
      { key: 'property_type', description: 'Property type', example: 'Single Family Home' },
      { key: 'delivery_address', description: 'Delivery location', example: '123 Main St' },
    ]
  },
  business: {
    name: 'Business Operations',
    icon: '💼',
    variables: [
      { key: 'account_number', description: 'Supplier account #', example: 'ACC-12345' },
      { key: 'contact_name', description: 'Contact person', example: 'Mike Wilson' },
      { key: 'agent_name', description: 'Agent/Rep name', example: 'Sarah' },
      { key: 'order_items', description: 'Items to order', example: 'Lumber, nails, screws' },
      { key: 'order_details', description: 'Full order info', example: 'SKU123 x 10 units' },
      { key: 'po_number', description: 'Purchase order #', example: 'PO-2024-001' },
      { key: 'payment_terms', description: 'Payment terms', example: 'Net 30' },
      { key: 'requested_delivery_date', description: 'When needed', example: '2024-01-15' },
      { key: 'quote_email', description: 'Email for quotes', example: 'quotes@company.com' },
      { key: 'quote_deadline', description: 'Quote due date', example: '2024-01-10' },
      { key: 'scope_of_work', description: 'Work description', example: 'Install new roof' },
      { key: 'inventory_items', description: 'Items to check', example: '2x4 lumber, drywall' },
    ]
  },
  custom: {
    name: 'Custom Fields',
    icon: '⚙️',
    variables: [
      { key: 'custom_field_name', description: 'Any custom field (snake_case)', example: 'Use {{field_name}}' },
    ]
  }
};

export function DynamicVariablePicker({ onSelect, buttonVariant = 'outline' }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);

  const handleCopy = (variable) => {
    const formatted = `{{${variable}}}`;
    navigator.clipboard.writeText(formatted);
    setCopied(variable);
    setTimeout(() => setCopied(null), 2000);
    if (onSelect) {
      onSelect(formatted);
    }
  };

  const filteredCategories = Object.entries(VARIABLE_CATEGORIES).reduce((acc, [key, category]) => {
    const filtered = category.variables.filter(v =>
      v.key.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[key] = { ...category, variables: filtered };
    }
    return acc;
  }, {});

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} size="sm">
          <span className="mr-2">{'{{ }}'}</span>
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {Object.entries(filteredCategories).map(([categoryKey, category]) => (
            <div key={categoryKey} className="p-4 border-b last:border-b-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{category.icon}</span>
                <h4 className="font-semibold">{category.name}</h4>
              </div>
              <div className="space-y-2">
                {category.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className="flex items-start justify-between p-2 rounded hover:bg-accent cursor-pointer group"
                    onClick={() => handleCopy(variable.key)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                          {`{{${variable.key}}}`}
                        </code>
                        {copied === variable.key && (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{variable.description}</p>
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Example: {variable.example}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(variable.key);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-muted/50 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Variables are automatically replaced with real data from your CRM when agents make calls or workflows execute.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function VariableBadge({ variable }) {
  return (
    <Badge variant="secondary" className="font-mono">
      {variable}
    </Badge>
  );
}

// Helper function to extract variables from text
export function extractVariables(text) {
  const regex = /{{(\w+)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

// Helper to get variable info
export function getVariableInfo(variableKey) {
  for (const category of Object.values(VARIABLE_CATEGORIES)) {
    const variable = category.variables.find(v => v.key === variableKey);
    if (variable) {
      return variable;
    }
  }
  return null;
}
