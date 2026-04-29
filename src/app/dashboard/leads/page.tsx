import { supabaseAdmin } from '@/lib/supabase';
import { Mail, Phone, Calendar } from 'lucide-react';

export default async function LeadsPage() {
  // Buscar leads e fazer um JOIN com a tabela quizzes para pegar o nome
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select(`
      *,
      quizzes (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="text-red-500 p-8">Erro ao carregar leads: {error.message}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Leads Capturados</h2>
        <p className="text-gray-500 mt-1">Acompanhe as pessoas que chegaram até o final dos seus quizzes.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {leads && leads.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Quiz de Origem</th>
                <th className="p-4 font-medium">Respostas e Dados Capturados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead: any) => {
                // Acessa as respostas do JSONB
                const answers = lead.metadata?.answers || {};
                const contact = lead.contact_info || {};

                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500 align-top">
                      <div className="flex items-center space-x-2">
                        <Calendar size={14} />
                        <span>{new Date(lead.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.quizzes?.name || 'Quiz Deletado'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      <div className="space-y-2">
                        {Object.keys(answers).length > 0 ? (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alternativas Escolhidas:</p>
                            <ul className="space-y-1">
                              {Object.entries(answers).map(([questionId, answerLabel]: any) => (
                                <li key={questionId} className="flex space-x-2">
                                  <span className="text-blue-600 font-medium">→</span>
                                  <span>{answerLabel}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Nenhuma resposta registrada.</span>
                        )}
                        
                        {Object.keys(contact).length > 0 && (
                          <div className="flex space-x-4 mt-2">
                            {contact.email && (
                              <div className="flex items-center space-x-1 text-gray-600">
                                <Mail size={14} /> <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center space-x-1 text-gray-600">
                                <Phone size={14} /> <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Mail size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum Lead Ainda</h3>
            <p className="text-center">As respostas dos seus visitantes aparecerão aqui assim que eles finalizarem um quiz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
