// Simple setup for public access
const API_URL = 'http://localhost:8055';
const EMAIL = 'admin@hudsonstreetlibrary.org';
const PASSWORD = 'HudsonLibrary123!';

async function main() {
  try {
    // Login
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    const loginData = await loginRes.json();
    const token = loginData.data.access_token;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Create public role
    console.log('Creating public role...');
    try {
      const roleRes = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Public',
          icon: 'public',
          description: 'Public access'
        })
      });
      
      const roleData = await roleRes.json();
      console.log('Role response:', roleData);
      
      if (roleData.data) {
        const roleId = roleData.data.id;
        console.log('Public role created with ID:', roleId);
        
        // Create permission for books
        console.log('Creating books permission...');
        const permRes = await fetch(`${API_URL}/permissions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            role: roleId,
            collection: 'books',
            action: 'read',
            fields: '*'
          })
        });
        
        console.log('Permission response:', await permRes.json());
      }
    } catch (e) {
      console.log('Role might already exist:', e.message);
    }

    console.log('\nDone! You may need to restart Directus for changes to take effect.');
    console.log('Try accessing: http://localhost:8055/items/books');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();