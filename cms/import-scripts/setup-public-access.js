// Setup public access for books and collections
const API_URL = 'http://localhost:8055';
const EMAIL = 'admin@hudsonstreetlibrary.org';
const PASSWORD = 'HudsonLibrary123!';

async function setupPublicAccess() {
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login');
    }

    const { data: { access_token } } = await loginResponse.json();
    console.log('Login successful');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    };

    // Check if public role exists
    console.log('Checking for public role...');
    const rolesResponse = await fetch(`${API_URL}/roles`, { headers });
    const { data: roles } = await rolesResponse.json();
    
    let publicRole = roles.find(role => role.name === 'Public');
    
    if (!publicRole) {
      console.log('Creating public role...');
      const createRoleResponse = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Public',
          icon: 'public',
          description: 'Public access for website',
          admin_access: false,
          app_access: false
        })
      });

      if (!createRoleResponse.ok) {
        console.error('Failed to create role:', await createRoleResponse.text());
        return;
      }

      const { data: newRole } = await createRoleResponse.json();
      publicRole = newRole;
      console.log('Public role created');
    } else {
      console.log('Public role already exists');
    }

    // Set permissions for books collection
    console.log('Setting permissions for books...');
    const bookPermissions = {
      role: publicRole.id,
      collection: 'books',
      action: 'read',
      permissions: {},
      fields: '*'
    };

    // Check if permission already exists
    const permissionsResponse = await fetch(
      `${API_URL}/permissions?filter[role][_eq]=${publicRole.id}&filter[collection][_eq]=books&filter[action][_eq]=read`,
      { headers }
    );
    const { data: existingPermissions } = await permissionsResponse.json();

    if (existingPermissions.length === 0) {
      const createPermResponse = await fetch(`${API_URL}/permissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bookPermissions)
      });

      if (createPermResponse.ok) {
        console.log('✅ Books read permission created');
      } else {
        console.error('Failed to create books permission:', await createPermResponse.text());
      }
    } else {
      console.log('Books permission already exists');
    }

    // Set permissions for collections
    console.log('Setting permissions for collections...');
    const collectionsPermissions = {
      role: publicRole.id,
      collection: 'collections',
      action: 'read',
      permissions: {},
      fields: '*'
    };

    // Check if collections table exists first
    const collectionsCheckResponse = await fetch(
      `${API_URL}/permissions?filter[role][_eq]=${publicRole.id}&filter[collection][_eq]=collections&filter[action][_eq]=read`,
      { headers }
    );
    
    if (collectionsCheckResponse.ok) {
      const { data: existingCollPermissions } = await collectionsCheckResponse.json();
      
      if (existingCollPermissions.length === 0) {
        const createCollPermResponse = await fetch(`${API_URL}/permissions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(collectionsPermissions)
        });

        if (createCollPermResponse.ok) {
          console.log('✅ Collections read permission created');
        }
      } else {
        console.log('Collections permission already exists');
      }
    }

    // Set permissions for directus_files (for images)
    console.log('Setting permissions for files...');
    const filesPermissions = {
      role: publicRole.id,
      collection: 'directus_files',
      action: 'read',
      permissions: {},
      fields: '*'
    };

    const filesPermResponse = await fetch(
      `${API_URL}/permissions?filter[role][_eq]=${publicRole.id}&filter[collection][_eq]=directus_files&filter[action][_eq]=read`,
      { headers }
    );
    const { data: existingFilePermissions } = await filesPermResponse.json();

    if (existingFilePermissions.length === 0) {
      const createFilePermResponse = await fetch(`${API_URL}/permissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(filesPermissions)
      });

      if (createFilePermResponse.ok) {
        console.log('✅ Files read permission created');
      }
    } else {
      console.log('Files permission already exists');
    }

    console.log('\n✅ Public access setup complete!');
    console.log('The API should now be accessible without authentication.');

  } catch (error) {
    console.error('Error setting up public access:', error);
  }
}

setupPublicAccess();