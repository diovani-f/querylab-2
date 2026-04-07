import React, { useState } from "react";
import { businessDictionary } from "@/lib/business-dictionary";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export function DataDictionary() {
    const [openCard, setOpenCard] = useState<string | null>(null);

    const toggleCard = (id: string) => {
        setOpenCard(openCard === id ? null : id);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                    Dicionário de Dados
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Explore as categorias abaixo para entender quais informações estão disponíveis e descubra o poder das perguntas que você pode fazer ao sistema.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {businessDictionary.map((category) => {
                    const Icon = category.icon;
                    const isOpen = openCard === category.id;

                    return (
                        <div
                            key={category.id}
                            onClick={() => toggleCard(category.id)}
                            className={`group flex flex-col border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer bg-white dark:bg-[#111116] hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700 ${isOpen ? 'ring-2 ring-indigo-500 shadow-lg' : 'shadow-sm'}`}
                        >
                            <div className="p-6 md:p-8 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-5">
                                    <div className={`p-4 rounded-2xl transition-colors duration-300 ${isOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20'}`}>
                                        <Icon className="w-7 h-7 md:w-8 md:h-8" />
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{category.title}</h2>
                                        <p className="text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{category.description}</p>
                                    </div>
                                </div>
                                <div className={`mt-2 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'text-indigo-500' : 'text-gray-400'}`}>
                                    {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                </div>
                            </div>

                            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="px-6 md:px-8 pb-8 pt-2">
                                        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest mb-4">Métricas Disponíveis</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                                {category.items.map((item, index) => (
                                                    <div key={index} className="flex items-start gap-2.5">
                                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10">
                                                <div className="flex gap-2 text-indigo-600 dark:text-indigo-400 mb-2.5 items-center">
                                                    <Sparkles className="w-4 h-4" />
                                                    <span className="text-sm font-bold uppercase tracking-wide">Exemplo Real</span>
                                                </div>
                                                <p className="text-gray-800 dark:text-gray-200 italic font-medium leading-relaxed">
                                                    "{category.exampleQuestion}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
