"use client";

import { useState } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMOJI_OPTIONS = [
  "🍽️","🚗","🎮","🏠","📱","💡","🛒","💊","🎓","✈️","🐶","🏋️",
  "🎵","📚","👕","🔧","🌿","☕","🎁","💈","🏥","⚽","🎭","🖥️",
  "💼","💻","📈","💰","🏦","🎯","🌟","🤝","📦","🚀","🎨","🍕",
];

interface Props {
  type: "expense" | "income";
  existingCategories: { name: string; icon: string }[];
  customCategories: { name: string; icon: string; color: string }[];
  onAdd: (name: string, icon: string) => boolean;
  onRemove: (name: string) => void;
  onClose: () => void;
}

export function CustomCategoryModal({
  type, existingCategories, customCategories, onAdd, onRemove, onClose
}: Props) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💡");
  const [error, setError] = useState("");

  const isExpense = type === "expense";
  const accentColor = isExpense ? "orange" : "emerald";
  const accentClass = isExpense
    ? "border-orange-500 text-orange-400 bg-orange-500/10"
    : "border-emerald-500 text-emerald-400 bg-emerald-500/10";
  const btnClass = isExpense
    ? "from-orange-500 to-pink-500 shadow-orange-500/20"
    : "from-emerald-500 to-teal-500 shadow-emerald-500/20";

  const allNames = [...existingCategories, ...customCategories].map(c => c.name.toLowerCase());

  function handleAdd() {
    if (!newName.trim()) { setError("Digite um nome para a categoria."); return; }
    if (allNames.includes(newName.trim().toLowerCase())) { setError("Já existe uma categoria com esse nome."); return; }
    onAdd(newName.trim(), newIcon);
    setNewName("");
    setNewIcon("💡");
    setError("");
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-[480px]">
        <Card className="bg-[#0f0f1a] border-white/[0.07] overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-[15px] font-bold text-white flex items-center gap-2`}>
                <Plus className={`w-4 h-4 ${isExpense ? "text-orange-500" : "text-emerald-500"}`} />
                Gerenciar Categorias de {isExpense ? "Gasto" : "Receita"}
              </CardTitle>
              <button onClick={onClose} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Categorias padrão */}
            <div>
              <p className="text-xs text-[#666] uppercase tracking-wider font-medium mb-2">Categorias padrão</p>
              <div className="flex flex-wrap gap-1.5">
                {existingCategories.map(c => (
                  <span key={c.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#aaa]">
                    {c.icon} {c.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Categorias customizadas */}
            {customCategories.length > 0 && (
              <div>
                <p className="text-xs text-[#666] uppercase tracking-wider font-medium mb-2">Suas categorias</p>
                <div className="flex flex-wrap gap-1.5">
                  {customCategories.map(c => (
                    <span key={c.name} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${accentClass}`}>
                      {c.icon} {c.name}
                      <button onClick={() => onRemove(c.name)} className="hover:text-red-400 transition-colors ml-0.5 cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Criar nova categoria */}
            <div className="border-t border-white/[0.07] pt-4">
              <p className="text-xs text-[#666] uppercase tracking-wider font-medium mb-3">Nova categoria</p>

              {/* Seletor de emoji */}
              <div className="mb-3">
                <p className="text-xs text-[#888] mb-2">Escolha um ícone:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewIcon(emoji)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer border ${
                        newIcon === emoji
                          ? `border-${accentColor}-500 bg-${accentColor}-500/20`
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                  {newIcon}
                </div>
                <input
                  className={`flex-1 bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-${accentColor}-500 placeholder:text-[#666] transition-colors`}
                  placeholder="Nome da categoria"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  maxLength={24}
                />
                <button
                  onClick={handleAdd}
                  className={`bg-gradient-to-br ${btnClass} text-white font-bold rounded-xl px-4 py-2.5 text-sm hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-lg whitespace-nowrap`}
                >
                  <Check className="w-4 h-4" /> Criar
                </button>
              </div>
              {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
