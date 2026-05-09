import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal';
import ConfirmModal from '../components/ConfirmModal';

const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      if (taskData.id) {
        await api.put(`/tasks/${taskData.id}`, taskData);
      } else {
        await api.post('/tasks', taskData);
      }
      setIsTaskModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task', error);
      alert('Erro ao salvar tarefa. Tente novamente.');
    }
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task', error);
      alert('Erro ao deletar tarefa.');
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error toggling task status', error);
    }
  };

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'URGENT': return <span className="bg-red-900/50 text-red-400 border border-red-800 text-xs px-2 py-1 rounded">Urgente</span>;
      case 'MEDIUM': return <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-800 text-xs px-2 py-1 rounded">Média</span>;
      case 'LOW': return <span className="bg-green-900/50 text-green-400 border border-green-800 text-xs px-2 py-1 rounded">Baixa</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DONE': return <span className="text-emerald-400 text-sm font-medium">Concluído</span>;
      case 'IN_PROGRESS': return <span className="text-blue-400 text-sm font-medium">Fazendo</span>;
      default: return <span className="text-gray-400 text-sm font-medium">A Fazer</span>;
    }
  };

  if (loading) {
    return <div className="text-white flex justify-center items-center h-full">Carregando...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Minhas Tarefas</h1>
        <button 
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Tarefa
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-300">
            <thead className="bg-gray-900 text-gray-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Tarefa</th>
                <th className="px-6 py-4 font-medium">Prioridade</th>
                <th className="px-6 py-4 font-medium">Prazo</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhuma tarefa encontrada. Clique em "Nova Tarefa" para começar.
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleTaskStatus(task)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        title={task.status === 'DONE' ? 'Desmarcar' : 'Concluir'}
                      >
                        {task.status === 'DONE' ? (
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-500 hover:text-emerald-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${task.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 mb-2">{getStatusBadge(task.status)}</div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map(tag => (
                            <span key={tag.id} className={`${tag.color} text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm`}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(task)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSave={handleSaveTask}
        initialData={editingTask}
      />

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default TasksList;
