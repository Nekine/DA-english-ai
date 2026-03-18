import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Copy, CheckCheck } from 'lucide-react';
import Header from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useLocation } from 'react-router-dom';
import { dictionaryService } from '@/services/dictionaryService';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { toast as sonnerToast } from 'sonner';

const DictionaryResult: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const searchParams = new URLSearchParams(location.search);
    const keyword = searchParams.get('keyword') || '';
    const provider = (searchParams.get('provider') as 'gemini' | 'openai') || 'gemini';

    const [wordData, setWordData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Function to play pronunciation
    const playPronunciation = () => {
        // This would typically use the Web Speech API or an external pronunciation service
        if (keyword) {
            const utterance = new SpeechSynthesisUtterance(keyword);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    };

    // Function to copy result to clipboard
    const handleCopy = async () => {
        if (wordData) {
            await navigator.clipboard.writeText(wordData);
            setCopied(true);
            sonnerToast.success("Đã sao chép kết quả tra từ");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        const fetchWordDefinition = async () => {
            if (!keyword) {
                navigate('/dictionary');
                return;
            }

            setIsLoading(true);

            try {
                console.log('Fetching word definition for:', keyword, 'using provider:', provider);
                const result = await dictionaryService.searchWord(keyword, provider);

                if (result) {
                    // Treat the response as a string
                    setWordData(typeof result === 'string' ? result : JSON.stringify(result));
                    console.log('Data fetched successfully');
                } else {
                    console.log('No definition found for:', keyword);
                    toast({
                        title: "Không tìm thấy từ",
                        description: `Không tìm thấy từ "${keyword}" trong từ điển`,
                        variant: "destructive"
                    });
                    // Wait a moment before navigating back
                    setTimeout(() => navigate('/dictionary'), 2000);
                }
            } catch (err) {
                console.error('Error fetching word definition:', err);
                toast({
                    title: "Lỗi",
                    description: "Không thể tra cứu từ điển. Vui lòng thử lại sau.",
                    variant: "destructive"
                });
                setTimeout(() => navigate('/dictionary'), 2000);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWordDefinition();
    }, [keyword, provider, navigate, toast]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-soft">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-lg text-foreground">Đang tải dữ liệu từ điển...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-soft">
            <Header />
            <main className="flex-1 container max-w-screen-xl mx-auto py-4 px-4 animate-fade-in">
                <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => navigate('/dictionary')}
                        >
                            <ArrowLeft size={18} />
                            Quay lại
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex items-center gap-2"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <>
                                        <CheckCheck size={18} />
                                        Đã sao chép
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} />
                                        Sao chép
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                className="rounded-full p-2"
                                aria-label="Phát âm"
                                onClick={playPronunciation}
                            >
                                <Volume2 size={24} />
                            </Button>
                        </div>
                    </div>

                    {/* Word Title */}
                    <h1 className="text-4xl font-bold text-primary uppercase mb-2">
                        {keyword}
                    </h1>
                    <Separator className="bg-gradient-primary h-1 rounded-full mb-6" />

                    {wordData ? (
                        <div className="prose prose-pink max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => (
                                        <h1 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-border">
                                            {children}
                                        </h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-xl font-bold text-foreground mt-6 mb-3">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
                                            {children}
                                        </h3>
                                    ),
                                    p: ({ children }) => (
                                        <p className="text-foreground leading-relaxed mb-4">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">
                                            {children}
                                        </ul>
                                    ),
                                    li: ({ children }) => (
                                        <li className="leading-relaxed">
                                            {children}
                                        </li>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-primary">
                                            {children}
                                        </strong>
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-accent/50 rounded-r">
                                            {children}
                                        </blockquote>
                                    ),
                                    em: ({ children }) => (
                                        <em className="italic text-muted-foreground">
                                            {children}
                                        </em>
                                    ),
                                }}
                            >
                                {wordData}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                Không có dữ liệu từ điển cho từ này.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DictionaryResult;