import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { useState, useCallback } from 'react';
// Icons update
import {
  UploadCloud, Bold, Italic, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, // ✨ ADDED: Image Icon
  Baseline, // ✨ ADDED: Text Color Icon
  RefreshCw, // ✨ ADDED: Regenerate Icon
  FileText, // ✨ ADDED: Google Docs Icon
  Download // ✨ ADDED: Sync Icon
} from 'lucide-react';
import Button from "../../components/common/Button";
import toast from 'react-hot-toast';

// Helper to parse error and extract rate limit info
const parseErrorMessage = (err) => {
  const errorText = err.response?.data?.error || err.message || '';
  
  // Check for rate limit error
  if (err.response?.status === 429 || errorText.includes('rate_limit') || errorText.includes('Rate limit')) {
    const retryMatch = errorText.match(/try again in (\d+m?\d*\.?\d*s?)/i);
    const waitTime = retryMatch ? retryMatch[1] : '5 minutes';
    return `API rate limit exceeded. Wait ${waitTime}.`;
  }
  
  // Check for auth error
  if (err.response?.status === 401) {
    return 'Authentication failed. Check your API Key.';
  }
  
  // Generic error
  return 'An error occurred. Please try again.';
};

// Tiptap Extensions
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color'; // ✨ ADDED
import Image from '@tiptap/extension-image'; // ✨ ADDED
import { Extension } from '@tiptap/core';

// --- Custom Extension for Font Size (Previous Code) ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    };
  },
});
// --------------------------------------

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  // ✨ ADDED: Function to add image
  const addImage = useCallback(() => {
    const url = window.prompt('URL');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1 p-1.5 sm:p-2 bg-zinc-900 border-b border-white/5 items-center mb-2 overflow-x-auto">
      {/* Bold / Italic */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1 sm:p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bold"
      >
        <Bold size={14} className="sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1 sm:p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Italic"
      >
        <Italic size={14} className="sm:w-4 sm:h-4" />
      </button>

      {/* ✨ ADDED: Color Picker */}
      <div className="flex items-center relative p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
        <Baseline size={16} className="absolute pointer-events-none" />
        <input
          type="color"
          onInput={event => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#ffffff'} // Default white for dark mode
          className="opacity-0 w-4 h-4 cursor-pointer"
          title="Text Color"
        />
      </div>

      <div className="w-px h-5 sm:h-6 bg-zinc-800 mx-0.5 sm:mx-1 self-center hidden sm:block" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 sm:p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bullet List"
      >
        <List size={14} className="sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 sm:p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Ordered List"
      >
        <ListOrdered size={14} className="sm:w-4 sm:h-4" />
      </button>

      <div className="w-px h-5 sm:h-6 bg-zinc-800 mx-0.5 sm:mx-1 self-center hidden sm:block" />

      {/* Alignment - hide on mobile */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`hidden sm:block p-1 sm:p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Left"
      >
        <AlignLeft size={14} className="sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`hidden sm:block p-1 sm:p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Center"
      >
        <AlignCenter size={14} className="sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`hidden sm:block p-1 sm:p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Right"
      >
        <AlignRight size={14} className="sm:w-4 sm:h-4" />
      </button>

      <div className="w-px h-5 sm:h-6 bg-zinc-800 mx-0.5 sm:mx-1 self-center hidden sm:block" />

      {/* Font & Size - hide on very small screens */}
      <select
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        className="hidden sm:block bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs rounded p-1 sm:p-1.5 border border-zinc-700 outline-none focus:border-indigo-500 w-16 sm:w-20"
        value={editor.getAttributes('textStyle').fontFamily || ''}
      >
        <option value="" disabled>Font</option>
        <option value="Inter">Inter</option>
        <option value="Comic Sans MS, Comic Sans">Comic</option>
        <option value="serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>

      <select
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        className="hidden sm:block bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs rounded p-1 sm:p-1.5 border border-zinc-700 outline-none focus:border-indigo-500 w-12 sm:w-16 ml-0.5 sm:ml-1"
        value={editor.getAttributes('textStyle').fontSize || ''}
      >
        <option value="" disabled>Size</option>
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="20px">20</option>
        <option value="24px">24</option>
        <option value="30px">30</option>
      </select>

      <div className="w-px h-5 sm:h-6 bg-zinc-800 mx-0.5 sm:mx-1 self-center hidden sm:block" />

      {/* ✨ ADDED: Image Button */}
      <button
        onClick={addImage}
        className="p-1 sm:p-1.5 rounded text-zinc-400 hover:bg-zinc-800"
        title="Insert Image"
      >
        <ImageIcon size={14} className="sm:w-4 sm:h-4" />
      </button>
    </div>
  );
};

const Editor = ({ initialContent, solutionId, onRegenerate }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [openingDocs, setOpeningDocs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleDocId, setGoogleDocId] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color, // ✨ ADDED Extension
      Image, // ✨ ADDED Extension
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] px-4 py-2',
      },
    },
  });

  const handleOpenInGoogleDocs = async () => {
    if (!editor) return;
    setOpeningDocs(true);
    const toastId = toast.loading('Creating Google Doc...');

    try {
      const res = await api.post('/classroom/open-in-docs', {
        solutionId,
        userId: user._id,
        content: editor.getHTML()
      });

      // Store the doc ID for syncing later
      setGoogleDocId(res.data.docId);
      
      toast.success('Opening in Google Docs... Click "Sync from Docs" when done editing!', { id: toastId, duration: 5000 });
      
      // Open the Google Doc in a new tab
      window.open(res.data.editLink, '_blank');
      
    } catch (err) {
      console.error('Google Docs error:', err);
      toast.error(parseErrorMessage(err), { id: toastId });
    } finally {
      setOpeningDocs(false);
    }
  };

  const handleSyncFromDocs = async () => {
    if (!googleDocId) {
      toast.error("No Google Doc linked. Click 'Edit in Google Docs' first.");
      return;
    }
    
    setSyncing(true);
    const toastId = toast.loading('Syncing from Google Docs...');

    try {
      const res = await api.post('/classroom/sync-from-docs', {
        docId: googleDocId,
        userId: user._id
      });

      // Update the TipTap editor with the synced content
      if (res.data.content && editor) {
        editor.commands.setContent(res.data.content);
        toast.success('Content synced from Google Docs!', { id: toastId });
      } else {
        toast.error('No content received', { id: toastId });
      }
      
    } catch (err) {
      console.error('Sync error:', err);
      toast.error(parseErrorMessage(err), { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async () => {
    if (!editor) return;
    setSubmitting(true);
    const toastId = toast.loading('Uploading solution to Google Drive...');

    try {
      const res = await api.post('/classroom/submit', {
        solutionId,
        userId: user._id,
        editedContent: editor.getHTML()
      });
      
      // Show success with folder path
      toast.success(
        `Saved to Drive: ${res.data.folderPath}`, 
        { id: toastId, duration: 5000 }
      );
      
      // Open classroom link for manual submission
      if (res.data.classroomLink) {
        toast(`Opening Google Classroom for manual attachment...`, { 
          icon: '📎',
          duration: 3000 
        });
        setTimeout(() => {
          window.open(res.data.classroomLink, '_blank');
        }, 1500);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(parseErrorMessage(err), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/30">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 sm:p-4 border-b border-white/5 bg-zinc-900/50">
        <h2 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">Editor</h2>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              size="sm"
              variant="secondary"
              className="text-[10px] sm:text-xs px-2 sm:px-3"
            >
              <RefreshCw size={12} className="sm:w-[14px] sm:h-[14px] mr-1" /> <span className="hidden xs:inline">Regenerate</span><span className="xs:hidden">Regen</span>
            </Button>
          )}
          <Button
            onClick={handleOpenInGoogleDocs}
            loading={openingDocs}
            size="sm"
            variant="secondary"
            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs px-2 sm:px-3"
          >
            <FileText size={12} className="sm:w-[14px] sm:h-[14px] mr-1" /> <span className="hidden sm:inline">{googleDocId ? 'Open Docs' : 'Edit in Docs'}</span><span className="sm:hidden">Docs</span>
          </Button>
          {googleDocId && (
            <Button
              onClick={handleSyncFromDocs}
              loading={syncing}
              size="sm"
              variant="secondary"
              className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] sm:text-xs px-2 sm:px-3"
            >
              <Download size={12} className="sm:w-[14px] sm:h-[14px] mr-1" /> <span className="hidden sm:inline">Sync from Docs</span><span className="sm:hidden">Sync</span>
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            loading={submitting}
            size="sm"
            variant="primary"
            className="bg-green-600 hover:bg-green-500 text-white text-[10px] sm:text-xs px-2 sm:px-3"
          >
            <UploadCloud size={12} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Submit to Classroom</span><span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </div>

      <MenuBar editor={editor} />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default Editor;