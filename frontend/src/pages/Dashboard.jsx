import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { CheckCircle, Clock, CalendarDays, Plus } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ total: 0, completed_last_7_days: 0, overdue: 0, upcomingTasks: [] });
  const [loading, setLoading] = useState(true);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleSaveTask = async (taskData) => {
    try {
      await api.post('/tasks', taskData);
      setIsTaskModalOpen(false);
      fetchStats();
    } catch (error) {
      console.error('Error saving task', error);
      alert('Erro ao salvar tarefa.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full text-white">Carregando...</div>;
  }

  // Glassmorphism classes
  const glassCard = "bg-gray-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-2xl p-6 relative overflow-hidden";

  return (
    <div className="space-y-8 relative h-full pb-16">
      {/* Greeting Section */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {getGreeting()}, <span className="text-indigo-400">{user?.name?.split(' ')[0] || 'Usuário'}</span>! 👋
        </h1>
        <p className="text-gray-400 mt-2">Aqui está o resumo das suas atividades.</p>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className={glassCard}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 mr-4 border border-blue-500/20">
              <CalendarDays className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-300">Total de Tarefas</p>
          </div>
          <p className="text-4xl font-black text-white relative z-10">{stats.total}</p>
        </div>

        <div className={glassCard}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 mr-4 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-300">Concluídas (7 dias)</p>
          </div>
          <p className="text-4xl font-black text-white relative z-10">{stats.completed_last_7_days}</p>
        </div>

        <div className={glassCard}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400 mr-4 border border-red-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-300">Atrasadas</p>
          </div>
          <p className="text-4xl font-black text-white relative z-10">{stats.overdue}</p>
        </div>
      </div>
      
      {/* Upcoming Tasks */}
      <div className={`${glassCard} mt-8`}>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-400" />
          Próximos Vencimentos
        </h2>
        
        <div className="space-y-4">
          {stats.upcomingTasks && stats.upcomingTasks.length > 0 ? (
            stats.upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-4 ${
                    task.priority === 'URGENT' ? 'bg-red-500' : 
                    task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <h3 className="text-white font-medium">{task.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">Status: {
                      task.status === 'TODO' ? 'A Fazer' : 'Fazendo'
                    }</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-300 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
                    {format(new Date(task.due_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              Nenhuma tarefa pendente com prazo definido!
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsTaskModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all hover:scale-105 z-40"
        title="Nova Tarefa"
      >
        <Plus className="w-8 h-8" />
      </button>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSave={handleSaveTask}
        initialData={null}
      />
    </div>
  );
};

export default Dashboard;
