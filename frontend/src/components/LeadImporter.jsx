import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  Users,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeadImporter({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [importMethod, setImportMethod] = useState('csv');
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [manualLeads, setManualLeads] = useState([{
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'manual'
  }]);
  const [importResults, setImportResults] = useState(null);
  const queryClient = useQueryClient();

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (leads) => {
      const res = await api.post('/leads/import', {
        leads,
        batchId: `IMPORT-${Date.now()}`
      });
      return res.data;
    },
    onSuccess: (data) => {
      setImportResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      if (onSuccess) onSuccess();
    }
  });

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(uploadedFile);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const lead = {
        source: 'import'
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';

        // Map common CSV column names to our schema
        if (header === 'name' || header === 'full name' || header === 'contact name') {
          lead.name = value;
        } else if (header === 'email' || header === 'email address') {
          lead.email = value;
        } else if (header === 'phone' || header === 'phone number' || header === 'mobile') {
          lead.phone = value;
        } else if (header === 'company' || header === 'company name' || header === 'organization') {
          lead.company = value;
        } else if (header === 'address' || header === 'street') {
          if (!lead.address) lead.address = {};
          lead.address.street = value;
        } else if (header === 'city') {
          if (!lead.address) lead.address = {};
          lead.address.city = value;
        } else if (header === 'state' || header === 'province') {
          if (!lead.address) lead.address = {};
          lead.address.state = value;
        } else if (header === 'zip' || header === 'zipcode' || header === 'postal code') {
          if (!lead.address) lead.address = {};
          lead.address.zipCode = value;
        } else if (header === 'status') {
          lead.status = value;
        } else if (header === 'priority') {
          lead.priority = value;
        } else if (header === 'notes' || header === 'description') {
          lead.notes = value;
        } else if (header === 'tags') {
          lead.tags = value.split(';').map(t => t.trim()).filter(Boolean);
        }
      });

      if (lead.name && lead.email && lead.phone) {
        leads.push(lead);
      }
    }

    return leads;
  };

  const handleImportCSV = () => {
    if (!csvText) {
      alert('Please upload or paste CSV data');
      return;
    }

    const leads = parseCSV(csvText);
    if (leads.length === 0) {
      alert('No valid leads found in CSV. Please ensure you have name, email, and phone columns.');
      return;
    }

    importMutation.mutate(leads);
  };

  const handleImportManual = () => {
    const validLeads = manualLeads.filter(lead =>
      lead.name && lead.email && lead.phone
    );

    if (validLeads.length === 0) {
      alert('Please fill in at least name, email, and phone for each lead');
      return;
    }

    importMutation.mutate(validLeads);
  };

  const addManualLead = () => {
    setManualLeads([...manualLeads, {
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'manual'
    }]);
  };

  const removeManualLead = (index) => {
    setManualLeads(manualLeads.filter((_, i) => i !== index));
  };

  const updateManualLead = (index, field, value) => {
    const updated = [...manualLeads];
    updated[index] = { ...updated[index], [field]: value };
    setManualLeads(updated);
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `name,email,phone,company,address,city,state,zip,status,priority,notes
John Doe,john@example.com,555-0100,Acme Corp,123 Main St,New York,NY,10001,new,medium,Interested in services
Jane Smith,jane@example.com,555-0101,Tech Inc,456 Oak Ave,Los Angeles,CA,90001,contacted,high,Follow up next week`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setCsvText('');
    setImportResults(null);
    setManualLeads([{
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'manual'
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Import Leads
          </DialogTitle>
          <DialogDescription>
            Import leads from CSV file or add them manually
          </DialogDescription>
        </DialogHeader>

        {!importResults ? (
          <Tabs value={importMethod} onValueChange={setImportMethod} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="csv">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV Upload
              </TabsTrigger>
              <TabsTrigger value="paste">
                <FileText className="h-4 w-4 mr-2" />
                Paste CSV
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* CSV Upload Tab */}
            <TabsContent value="csv" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload CSV File</CardTitle>
                  <CardDescription>
                    Upload a CSV file with lead information. Required columns: name, email, phone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                    {file && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCSV}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Sample CSV
                    </Button>

                    <Button
                      onClick={handleImportCSV}
                      disabled={!file || importMutation.isPending}
                    >
                      {importMutation.isPending ? 'Importing...' : 'Import Leads'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Paste CSV Tab */}
            <TabsContent value="paste" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Paste CSV Data</CardTitle>
                  <CardDescription>
                    Paste your CSV data directly. First row should be headers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="csvText">CSV Data</Label>
                    <Textarea
                      id="csvText"
                      placeholder="name,email,phone,company&#10;John Doe,john@example.com,555-0100,Acme Corp"
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCSV}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Sample CSV
                    </Button>

                    <Button
                      onClick={handleImportCSV}
                      disabled={!csvText || importMutation.isPending}
                    >
                      {importMutation.isPending ? 'Importing...' : 'Import Leads'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {manualLeads.map((lead, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Lead {index + 1}</CardTitle>
                        {manualLeads.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualLead(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`name-${index}`}>Name *</Label>
                        <Input
                          id={`name-${index}`}
                          value={lead.name}
                          onChange={(e) => updateManualLead(index, 'name', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`email-${index}`}>Email *</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          value={lead.email}
                          onChange={(e) => updateManualLead(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`phone-${index}`}>Phone *</Label>
                        <Input
                          id={`phone-${index}`}
                          value={lead.phone}
                          onChange={(e) => updateManualLead(index, 'phone', e.target.value)}
                          placeholder="555-0100"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`company-${index}`}>Company</Label>
                        <Input
                          id={`company-${index}`}
                          value={lead.company}
                          onChange={(e) => updateManualLead(index, 'company', e.target.value)}
                          placeholder="Acme Corp"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={addManualLead}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Lead
                </Button>

                <Button
                  onClick={handleImportManual}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? 'Importing...' : `Import ${manualLeads.length} Lead${manualLeads.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Import Results */
          <div className="space-y-4 py-4">
            <Card className={cn(
              "border-2",
              importResults.successful > 0 ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"
            )}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResults.successful > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{importResults.total}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{importResults.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {importResults.errors && importResults.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-600">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Errors ({importResults.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-sm">
                        <div className="font-semibold">Row {error.row}</div>
                        <div className="text-red-600">{error.error}</div>
                        {error.data && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(error.data)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
