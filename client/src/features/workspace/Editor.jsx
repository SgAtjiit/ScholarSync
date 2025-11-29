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
  Baseline // ✨ ADDED: Text Color Icon
} from 'lucide-react';
import Button from "../../components/common/Button";
import toast from 'react-hot-toast';

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
    <div className="flex flex-wrap gap-1 p-2 bg-zinc-900 border-b border-white/5 items-center mb-2">
      {/* Bold / Italic */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Italic"
      >
        <Italic size={16} />
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

      <div className="w-px h-6 bg-zinc-800 mx-1 self-center" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>

      <div className="w-px h-6 bg-zinc-800 mx-1 self-center" />

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>

      <div className="w-px h-6 bg-zinc-800 mx-1 self-center" />

      {/* Font & Size */}
      <select
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        className="bg-zinc-800 text-zinc-300 text-xs rounded p-1.5 border border-zinc-700 outline-none focus:border-indigo-500 w-20"
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
        className="bg-zinc-800 text-zinc-300 text-xs rounded p-1.5 border border-zinc-700 outline-none focus:border-indigo-500 w-16 ml-1"
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

      <div className="w-px h-6 bg-zinc-800 mx-1 self-center" />

      {/* ✨ ADDED: Image Button */}
      <button
        onClick={addImage}
        className="p-1.5 rounded text-zinc-400 hover:bg-zinc-800"
        title="Insert Image"
      >
        <ImageIcon size={16} />
      </button>
    </div>
  );
};

const Editor = ({ initialContent, solutionId }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!editor) return;
    setSubmitting(true);
    const toastId = toast.loading('Submitting assignment...');

    try {
      const res = await api.post('/classroom/submit', {
        solutionId,
        userId: user._id,
        editedContent: editor.getHTML()
      });
      if (res.data.classroomLink) {
        window.open(res.data.classroomLink, '_blank');
        toast.success("Submitted successfully to Classroom!", { id: toastId });
      }
    } catch (err) {
      toast.error(
        "Submission failed: " + (err.response?.data?.error || err.message),
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/30">
      <div className="flex justify-between items-center p-4 border-b border-white/5 bg-zinc-900/50">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Editor</h2>
        <Button
          onClick={handleSubmit}
          loading={submitting}
          size="sm"
          variant="primary"
          className="bg-green-600 hover:bg-green-500 text-white"
        >
          <UploadCloud size={16} /> Submit to Classroom
        </Button>
      </div>

      <MenuBar editor={editor} />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default Editor;