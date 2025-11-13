import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

export default function ProjectNew() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leadId: '',
    projectType: 'custom',
    status: 'pending',
    startDate: '',
    estimatedEndDate: '',
    estimate: {
      labor: 0,
      materials: 0,
      total: 0
    },
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      // Ensure we always set an array
      setLeads(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Failed to load customers');
      setLeads([]); // Set empty array on error
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleEstimateChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => {
      const newEstimate = {
        ...prev.estimate,
        [field]: numValue
      };
      // Automatically calculate total
      newEstimate.total = (newEstimate.labor || 0) + (newEstimate.materials || 0);
      return {
        ...prev,
        estimate: newEstimate
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/projects', formData);
      toast.success('Project created successfully');
      navigate(`/app/projects/${response.data._id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/projects')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Project</h1>
          <p className="text-muted-foreground">Create a new remodeling project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the project details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Kitchen Remodel - Smith Residence"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => handleChange('projectType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="bathroom">Bathroom</SelectItem>
                      <SelectItem value="basement">Basement</SelectItem>
                      <SelectItem value="addition">Addition</SelectItem>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="roofing">Roofing</SelectItem>
                      <SelectItem value="flooring">Flooring</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leadId">Customer</Label>
                  <Select
                    value={formData.leadId}
                    onValueChange={(value) => handleChange('leadId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads && leads.length > 0 ? (
                        leads.map((lead) => (
                          <SelectItem key={lead._id} value={lead._id}>
                            {lead.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          No customers available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedEndDate">Estimated End Date</Label>
                  <Input
                    id="estimatedEndDate"
                    type="date"
                    value={formData.estimatedEndDate}
                    onChange={(e) => handleChange('estimatedEndDate', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Full kitchen renovation including new cabinets, countertops, appliances, and flooring..."
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Project Address</CardTitle>
              <CardDescription>Where is this project located?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => handleChange('address.street', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleChange('address.city', e.target.value)}
                    placeholder="Springfield"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleChange('address.state', e.target.value)}
                    placeholder="IL"
                    maxLength={2}
                  />
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.address.zip}
                    onChange={(e) => handleChange('address.zip', e.target.value)}
                    placeholder="62701"
                    maxLength={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estimate */}
          <Card>
            <CardHeader>
              <CardTitle>Project Estimate</CardTitle>
              <CardDescription>Enter estimated costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="labor">Labor Costs</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="labor"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.estimate.labor}
                      onChange={(e) => handleEstimateChange('labor', e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="materials">Materials Costs</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="materials"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.estimate.materials}
                      onChange={(e) => handleEstimateChange('materials', e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="total">Total Estimate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="total"
                      type="number"
                      value={formData.estimate.total}
                      className="pl-7 bg-muted"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically calculated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/projects')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
