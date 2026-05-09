import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import TagSelector from './TagSelector';

const TaskModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    due_date: '',
    status: 'TODO',
    tags: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTask({
          ...initialData,
          tags: initialData.tags || []
        });
      } else {
        setTask({
          title: '',
          description: '',
          priority: 'MEDIUM',
          due_date: '',
          status: 'TODO',
          tags: []
        });
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!task.title.trim()) {
      setError('O título da tarefa é obrigatório.');
      return;
    }
    
    // Extract only tag IDs for the backend
    const taskToSave = {
      ...task,
      due_date: task.due_date || null,
      tags: task.tags.map(t => t.id)
    };

    onSave(taskToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">
          {initialData ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
        </h2>
        
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg flex items-center text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Título <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className={`w-full px-3 py-2 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors`}
              value={task.title}
              onChange={e => {
                setTask({...task, title: e.target.value});
                if(error) setError('');
              }}
              placeholder="Ex: Comprar leite"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
            <TagSelector 
              selectedTags={task.tags} 
              onChange={newTags => setTask({...task, tags: newTags})} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea 
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
              rows="3"
              value={task.description || ''}
              onChange={e => setTask({...task, description: e.target.value})}
              placeholder="Detalhes adicionais..."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prioridade</label>
              <select 
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                value={task.priority}
                onChange={e => setTask({...task, priority: e.target.value})}
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select 
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                value={task.status}
                onChange={e => setTask({...task, status: e.target.value})}
              >
                <option value="TODO">A Fazer</option>
                <option value="IN_PROGRESS">Fazendo</option>
                <option value="DONE">Concluído</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Prazo</label>
            <input 
              type="date"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
              value={task.due_date ? task.due_date.split('T')[0] : ''}
              onChange={e => setTask({...task, due_date: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg mt-6 transition-colors"
          >
            {initialData ? 'Salvar Alterações' : 'Salvar Tarefa'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
