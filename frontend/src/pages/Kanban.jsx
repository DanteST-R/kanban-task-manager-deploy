import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Edit2, Trash2, CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal';
import ConfirmModal from '../components/ConfirmModal';

const Kanban = () => {
  const [tasks, setTasks] = useState({
    TODO: [],
    IN_PROGRESS: [],
    DONE: []
  });
  
  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      const allTasks = response.data;
      
      const grouped = {
        TODO: allTasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: allTasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: allTasks.filter(t => t.status === 'DONE')
      };
      setTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = tasks[source.droppableId];
      const destCol = tasks[destination.droppableId];
      const sourceItems = [...sourceCol];
      const destItems = [...destCol];
      
      const [removed] = sourceItems.splice(source.index, 1);
      
      removed.status = destination.droppableId;
      destItems.splice(destination.index, 0, removed);
      
      setTasks({
        ...tasks,
        [source.droppableId]: sourceItems,
        [destination.droppableId]: destItems
      });

      try {
        await api.put(`/tasks/${removed.id}`, { status: destination.droppableId });
      } catch (err) {
        console.error('Failed to update task status', err);
        fetchTasks();
      }
    } else {
      const column = tasks[source.droppableId];
      const copiedItems = [...column];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);
      
      setTasks({
        ...tasks,
        [source.droppableId]: copiedItems
      });
    }
  };

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

  const columns = [
    { id: 'TODO', title: 'A Fazer' },
    { id: 'IN_PROGRESS', title: 'Fazendo' },
    { id: 'DONE', title: 'Concluído' }
  ];

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'URGENT': return 'bg-red-900/50 text-red-400 border border-red-800';
      case 'MEDIUM': return 'bg-yellow-900/50 text-yellow-400 border border-yellow-800';
      case 'LOW': return 'bg-green-900/50 text-green-400 border border-green-800';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quadro Kanban</h1>
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

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max items-start">
            {columns.map(column => (
              <div key={column.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 w-80 flex flex-col h-full max-h-full">
                <h2 className="font-semibold text-gray-300 mb-4 flex justify-between items-center">
                  {column.title}
                  <span className="bg-gray-700 text-gray-300 text-xs py-1 px-2 rounded-full">
                    {tasks[column.id].length}
                  </span>
                </h2>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 overflow-y-auto space-y-3 p-1 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-gray-800' : ''
                      }`}
                    >
                      {tasks[column.id].map((item, index) => (
                        <Draggable key={item.id.toString()} draggableId={item.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-gray-900 p-4 rounded-lg shadow-sm border group ${
                                snapshot.isDragging ? 'border-indigo-500 shadow-lg' : 'border-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${getPriorityColor(item.priority)}`}>
                                  {item.priority === 'URGENT' ? 'Urgente' : item.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                                </span>
                                
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => toggleTaskStatus(item)}
                                    className="p-1 text-gray-400 hover:text-emerald-400 rounded transition-colors"
                                    title={item.status === 'DONE' ? 'Desmarcar' : 'Concluir'}
                                  >
                                    {item.status === 'DONE' ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingTask(item);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-indigo-400 rounded transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClick(item)}
                                    className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <h3 className={`font-medium mb-1 ${item.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}`}>{item.title}</h3>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {item.tags.map(tag => (
                                    <span key={tag.id} className={`${tag.color} text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm`}>
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {item.description && (
                                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.description}</p>
                              )}
                              {item.due_date && (
                                <div className="text-xs text-gray-500 mt-2">
                                  Prazo: {format(new Date(item.due_date), 'dd/MM/yyyy')}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
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

export default Kanban;
