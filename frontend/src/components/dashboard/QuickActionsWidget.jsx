import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, UserPlus, Workflow, Mail, Calendar } from 'lucide-react';

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Phone,
      label: 'Deploy Agent',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => navigate('/app/agents')
    },
    {
      icon: UserPlus,
      label: 'Add Lead',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => navigate('/app/crm')
    },
    {
      icon: Workflow,
      label: 'Create Workflow',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => navigate('/app/workflows')
    },
    {
      icon: Calendar,
      label: 'Schedule Call',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => navigate('/app/crm')
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="default"
              className={`flex flex-col items-center justify-center h-20 ${action.color} text-white`}
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
