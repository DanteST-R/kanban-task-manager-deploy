import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, KanbanSquare, LogOut, CheckSquare, Tag, Folder, Settings } from 'lucide-react';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white';
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 h-screen">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <CheckSquare className="w-8 h-8 text-indigo-500 mr-2" />
        <span className="text-xl font-bold text-white">KanbanApp</span>
      </div>
      
      <div className="flex flex-col flex-1 overflow-y-auto mt-4 px-4 space-y-2">
        <Link to="/" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}>
          <LayoutDashboard className="w-5 h-5 mr-3" />
          Dashboard
        </Link>
        <Link to="/tasks" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/tasks')}`}>
          <CheckSquare className="w-5 h-5 mr-3" />
          Minhas Tarefas
        </Link>
        <Link to="/kanban" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/kanban')}`}>
          <KanbanSquare className="w-5 h-5 mr-3" />
          Kanban Board
        </Link>
        <Link to="/tags-view" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/tags-view')}`}>
          <Tag className="w-5 h-5 mr-3" />
          Visão por Tags
        </Link>
        <div className="my-2 border-t border-gray-800"></div>
        <Link to="/categories" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/categories')}`}>
          <Folder className="w-5 h-5 mr-3" />
          Categorias
        </Link>
        <Link to="/settings" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/settings')}`}>
          <Settings className="w-5 h-5 mr-3" />
          Configurações
        </Link>
      </div>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center mb-4 px-2">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-gray-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-600"></div>
          )}
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-gray-400 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
