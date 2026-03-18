import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi, getImageUrl } from '../lib/api';
import { Award } from 'lucide-react';

export default function AboutMe() {
  const [aboutMe, setAboutMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAboutMe();
  }, []);

  const loadAboutMe = async () => {
    try {
      const response = await publicApi.getSettings();
      const about = response.data.settings?.about_me;
      if (about && about.enabled) {
        setAboutMe(about);
      }
    } catch (error) {
      console.error('Failed to load about me:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !aboutMe) {
    return null;
  }

  return (
    <section
      id="about"
      className="py-20 bg-white"
      data-testid="about-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-slate-800 mb-4">
              About Me
            </h2>
            
            {aboutMe.name && (
              <h3 className="text-xl text-[#9F87C4] font-medium mb-6">
                {aboutMe.name}
              </h3>
            )}

            {aboutMe.bio && (
              <div className="text-slate-600 leading-relaxed mb-8 space-y-4">
                {aboutMe.bio.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            )}

            {aboutMe.qualifications && aboutMe.qualifications.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <Award size={20} className="text-[#9F87C4]" />
                  Qualifications
                </h4>
                <ul className="space-y-2">
                  {aboutMe.qualifications.map((qual, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3 text-slate-600"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#9F87C4] mt-2 flex-shrink-0" />
                      <span>{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Right: Photo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            {aboutMe.photo_url ? (
              <div className="relative">
                <div className="absolute inset-0 bg-[#9F87C4]/20 rounded-3xl transform rotate-3" />
                <img
                  src={getImageUrl(aboutMe.photo_url)}
                  alt={aboutMe.name || 'About me'}
                  className="relative rounded-3xl shadow-xl w-full max-w-md h-auto object-cover"
                />
              </div>
            ) : (
              <div className="w-full max-w-md h-[400px] bg-[#F5F3FA] rounded-3xl flex items-center justify-center">
                <span className="text-slate-400">Photo</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
