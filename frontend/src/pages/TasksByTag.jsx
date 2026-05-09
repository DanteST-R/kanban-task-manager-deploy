import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tag, Edit2, Trash2, CheckCircle, Circle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal';
import ConfirmModal from '../components/ConfirmModal';

const TasksByTag = () => {
  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const fetchData = async () => {
    try {
      const [tasksRes, tagsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tags')
      ]);
      setTasks(tasksRes.data);
      setTags(tagsRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      if (taskData.id) {
        await api.put(`/tasks/${taskData.id}`, taskData);
      } else {
        await api.post('/tasks', taskData);
      }
      setIsTaskModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving task', error);
      alert('Erro ao salvar tarefa.');
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
      fetchData();
    } catch (error) {
      console.error('Error deleting task', error);
      alert('Erro ao deletar tarefa.');
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      fetchData();
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

  const renderTaskCard = (task) => (
    <div key={task.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl shadow-sm group hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        {getPriorityBadge(task.priority)}
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => toggleTaskStatus(task)}
            className="p-1 text-gray-400 hover:text-emerald-400 rounded transition-colors"
            title={task.status === 'DONE' ? 'Desmarcar' : 'Concluir'}
          >
            {task.status === 'DONE' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            className="p-1 text-gray-400 hover:text-indigo-400 rounded transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDeleteClick(task)}
            className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <h3 className={`font-medium mb-1 ${task.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h3>
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 my-2">
          {task.tags.map(t => (
            <span key={t.id} className={`${t.color} text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm`}>
              {t.name}
            </span>
          ))}
        </div>
      )}
      {task.due_date && (
        <div className="text-xs text-gray-500 mt-2">
          Prazo: {format(new Date(task.due_date), 'dd/MM/yyyy')}
        </div>
      )}
    </div>
  );

  // Group tasks by tags
  const groupedTasks = tags.map(tag => ({
    ...tag,
    tasks: tasks.filter(task => task.tags?.some(t => t.id === tag.id))
  }));

  const untaggedTasks = tasks.filter(task => !task.tags || task.tags.length === 0);

  if (loading) {
    return <div className="text-white flex justify-center items-center h-full">Carregando...</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto pb-8 pr-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Visão por Tags</h1>
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

      <div className="space-y-8">
        {groupedTasks.map(tagGroup => (
          <div key={tagGroup.id} className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
            <div className="flex items-center mb-4">
              <span className={`w-4 h-4 rounded-full mr-3 ${tagGroup.color}`}></span>
              <h2 className="text-xl font-bold text-white">{tagGroup.name}</h2>
              <span className="ml-3 bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                {tagGroup.tasks.length} {tagGroup.tasks.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </div>
            
            {tagGroup.tasks.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Nenhuma tarefa com esta tag.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tagGroup.tasks.map(task => renderTaskCard(task))}
              </div>
            )}
          </div>
        ))}

        {/* Untagged Section */}
        {untaggedTasks.length > 0 && (
          <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 border-dashed">
            <div className="flex items-center mb-4">
              <Tag className="w-5 h-5 mr-3 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-300">Sem Tag</h2>
              <span className="ml-3 bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                {untaggedTasks.length} {untaggedTasks.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {untaggedTasks.map(task => renderTaskCard(task))}
            </div>
          </div>
        )}
        
        {tags.length === 0 && untaggedTasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhuma tarefa ou tag encontrada. Comece criando uma nova tarefa!
          </div>
        )}
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

export default TasksByTag;
