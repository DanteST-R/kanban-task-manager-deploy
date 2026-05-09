import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tag, X, Plus } from 'lucide-react';

const TagSelector = ({ selectedTags, onChange }) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags');
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Error fetching tags', error);
    }
  };

  const getRandomColor = () => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
      'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
      'bg-pink-500', 'bg-rose-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateTag = async () => {
    if (!inputValue.trim()) return;
    try {
      const response = await api.post('/tags', { 
        name: inputValue.trim(), 
        color: getRandomColor() 
      });
      const newTag = response.data;
      setAvailableTags([...availableTags, newTag]);
      handleAddTag(newTag);
      setInputValue('');
      setShowDropdown(false);
    } catch (error) {
      console.error('Error creating tag', error);
    }
  };

  const handleAddTag = (tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      onChange([...selectedTags, tag]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemoveTag = (tagId) => {
    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  const filteredTags = availableTags.filter(t => 
    t.name.toLowerCase().includes(inputValue.toLowerCase()) && 
    !selectedTags.find(st => st.id === t.id)
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <span 
            key={tag.id} 
            className={`${tag.color} text-white text-xs font-medium px-2 py-1 rounded-md flex items-center shadow-sm`}
          >
            <Tag className="w-3 h-3 mr-1" />
            {tag.name}
            <button 
              type="button" 
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:text-gray-200 focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      
      <div className="relative">
        <input
          type="text"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
          placeholder="Adicionar tag..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        
        {showDropdown && (inputValue || filteredTags.length > 0) && (
          <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredTags.map(tag => (
              <div 
                key={tag.id}
                onClick={() => handleAddTag(tag)}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center text-gray-300"
              >
                <span className={`w-3 h-3 rounded-full mr-2 ${tag.color}`}></span>
                {tag.name}
              </div>
            ))}
            
            {inputValue && !availableTags.find(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
              <div 
                onClick={handleCreateTag}
                className="px-3 py-2 hover:bg-indigo-900/30 text-indigo-400 cursor-pointer flex items-center border-t border-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar "{inputValue}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagSelector;
