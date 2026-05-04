
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
      env[key.trim()] = value.join('=').trim();
    }
  });
  return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectQuizzes() {
  console.log('--- Inspecionando Tabela quizzes ---');
  
  // Get column info from information_schema
  const { data: columns, error: colError } = await supabase.rpc('inspect_table', { table_name: 'quizzes' });
  
  // If rpc not available, use execute_sql if we can, or just try to insert a dummy to see errors
  if (colError) {
    console.log('RPC falhou, tentando via query direta...');
    // We can't query information_schema directly easily via PostgREST without a view
    // But we can try to select one row to see the structure
    const { data, error } = await supabase.from('quizzes').select('*').limit(1);
    if (error) {
      console.log('Erro ao ler quizzes:', error.message);
    } else {
      console.log('Colunas encontradas:', Object.keys(data[0] || {}).join(', '));
    }
  } else {
    console.log('Colunas:', columns);
  }

  // Check if there are any users in auth.users (if we can)
  // supabaseAdmin can sometimes see auth schema depending on setup
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  console.log('Usuários no sistema:', userError ? 'Erro: ' + userError.message : users.users.length);
}

inspectQuizzes();
