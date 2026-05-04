
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

async function checkSync() {
  console.log('--- Verificando Sincronia de Usuários ---');
  
  // Get users from auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erro ao listar usuários auth:', authError.message);
    return;
  }
  const authIds = authData.users.map(u => u.id);
  console.log('IDs no Auth:', authIds);

  // Get user_ids from quizzes
  const { data: quizzes, error: qError } = await supabase.from('quizzes').select('user_id').limit(10);
  if (qError) {
    console.error('Erro ao ler quizzes:', qError.message);
  } else {
    const quizUserIds = [...new Set(quizzes.map(q => q.user_id))];
    console.log('IDs usados nos Quizzes:', quizUserIds);
    
    quizUserIds.forEach(id => {
      if (authIds.includes(id)) {
        console.log(`✅ ID ${id} existe no Auth.`);
      } else {
        console.log(`❌ ID ${id} NÃO existe no Auth! (Orfão)`);
      }
    });
  }
}

checkSync();
