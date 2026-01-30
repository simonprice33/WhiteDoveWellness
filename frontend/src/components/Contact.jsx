import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi, getImageUrl } from '../lib/api';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [status, setStatus] = useState(null); // 'success', 'error', or null
  const [loading, setLoading] = useState(false);
  const [contactImageUrl, setContactImageUrl] = useState('/images/contact-dove.jpg');

  useEffect(() => {
    publicApi.getSettings().then(res => {
      if (res.data.settings?.images?.contact_image_url) {
        setContactImageUrl(res.data.settings.images.contact_image_url);
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await publicApi.submitContact(formData);
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-20 md:py-32 bg-white"
      data-testid="contact-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl md:text-5xl text-slate-800 mb-6">
              Get in Touch
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Ready to start your wellness journey? Send us a message and we'll get back to you to arrange your appointment.
            </p>

            {/* Decorative Image - White Dove */}
            <div className="hidden lg:block relative rounded-3xl overflow-hidden h-[400px]">
              <img
                src={contactImageUrl}
                alt="White Dove Wellness"
                className="w-full h-full object-contain bg-[#F5F3FA]"
              />
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <form
              onSubmit={handleSubmit}
              className="bg-[#FAFAF9] rounded-3xl p-8 md:p-10"
              data-testid="contact-form"
            >
              {/* Status Messages */}
              {status === 'success' && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-[#A7D7C5]/20 text-[#39A575] rounded-xl" data-testid="contact-success">
                  <CheckCircle size={20} />
                  <span>Thank you! We'll be in touch soon.</span>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 text-red-600 rounded-xl" data-testid="contact-error">
                  <AlertCircle size={20} />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Jane Smith"
                    className="bg-white border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20"
                    data-testid="contact-name-input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@example.com"
                    className="bg-white border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20"
                    data-testid="contact-email-input"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="07123 456789"
                    className="bg-white border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20"
                    data-testid="contact-phone-input"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Message *
                  </label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us about your needs or any questions you have..."
                    className="bg-white border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20 resize-none"
                    data-testid="contact-message-input"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#9F87C4] hover:bg-[#8A6EB5] text-white rounded-full py-6 font-medium text-lg transition-all hover:shadow-lg hover:-translate-y-1"
                  data-testid="contact-submit-btn"
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      Send Message
                      <Send size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
