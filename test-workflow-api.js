import fetch from 'node-fetch';

async function testWorkflowAPI() {
  try {
    // Login to get token
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.token) {
      console.log('❌ Login failed:', loginData.message);
      process.exit(1);
    }

    console.log('✅ Logged in successfully');

    // Test getting workflow
    const workflowId = '691e3d755aac5ad9da50ce37';
    const workflowResponse = await fetch(`http://localhost:5001/api/workflows/${workflowId}`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    const workflowData = await workflowResponse.json();

    if (workflowResponse.status === 200) {
      console.log('✅ Workflow retrieved successfully!');
      console.log('   Name:', workflowData.name);
      console.log('   Nodes:', workflowData.nodes?.length || 0);
      console.log('   Edges:', workflowData.edges?.length || 0);
      console.log('   Status:', workflowData.status);
    } else {
      console.log('❌ Failed to get workflow:', workflowData.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWorkflowAPI();
