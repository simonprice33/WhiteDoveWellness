import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft } from 'lucide-react';

export default function PolicyPage() {
  const { slug } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPolicy();
  }, [slug]);

  const loadPolicy = async () => {
    try {
      const response = await publicApi.getPolicy(slug);
      setPolicy(response.data.policy);
    } catch (err) {
      setError('Policy not found');
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-to-HTML converter
  const renderContent = (content) => {
    if (!content) return '';
    
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="font-serif text-3xl text-slate-800 mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="font-serif text-2xl text-slate-800 mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="font-serif text-xl text-slate-800 mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="text-slate-600 mb-2">{line}</p>;
      });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]" data-testid="policy-page">
      <Header />
      
      <main className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center text-[#9F87C4] hover:text-[#8A6EB5] mb-8"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Home
          </Link>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
              <article className="prose prose-slate max-w-none">
                {renderContent(policy?.content)}
              </article>
              
              <p className="text-sm text-slate-400 mt-8 pt-4 border-t">
                Last updated: {new Date(policy?.updated_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
