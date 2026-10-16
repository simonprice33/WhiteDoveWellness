import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft } from 'lucide-react';
import { renderPolicyContent } from '../components/PolicyAcceptance';

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
                {renderPolicyContent(policy?.content)}
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
