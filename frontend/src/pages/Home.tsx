import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen stars-bg">
      {/* Moon decoration */}
      <div className="moon"></div>

      <div className="container-bedtime">
        {/* Hero Section */}
        <div className="text-center pt-16 pb-12">
          <div className="mb-6">
            <span className="text-8xl animate-float inline-block">✨</span>
          </div>

          <h1 className="text-6xl md:text-7xl mb-6 text-bedtime-yellow text-shadow-glow">
            TaleWeaver
          </h1>

          <p className="text-2xl md:text-3xl text-bedtime-cream-warm mb-4">
            Magical Bedtime Stories
          </p>

          <p className="text-xl text-bedtime-cream/80 max-w-2xl mx-auto">
            Personalized tales that teach empathy, kindness, and important life lessons
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bedtime-card text-center">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="text-xl text-bedtime-yellow mb-3">Personalized</h3>
            <p className="text-bedtime-cream-warm">
              Stories tailored to your child's age, interests, and experiences
            </p>
          </div>

          <div className="bedtime-card text-center">
            <div className="text-5xl mb-4">💡</div>
            <h3 className="text-xl text-bedtime-yellow mb-3">Educational</h3>
            <p className="text-bedtime-cream-warm">
              Teaching important values like honesty, courage, and empathy
            </p>
          </div>

          <div className="bedtime-card text-center">
            <div className="text-5xl mb-4">🌟</div>
            <h3 className="text-xl text-bedtime-yellow mb-3">Interactive</h3>
            <p className="text-bedtime-cream-warm">
              Your child makes choices that shape the adventure
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bedtime-card mb-12">
          <h2 className="bedtime-card-header justify-center">
            <span className="star">⭐</span>
            <span>How It Works</span>
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-bedtime-yellow text-bedtime-purple-dark flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h4 className="text-lg font-bold text-bedtime-yellow mb-2">
                  Tell us about your child
                </h4>
                <p className="text-bedtime-cream-warm">
                  Share their name, age, interests, and what you'd like them to learn
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-bedtime-yellow text-bedtime-purple-dark flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h4 className="text-lg font-bold text-bedtime-yellow mb-2">
                  AI creates a unique story
                </h4>
                <p className="text-bedtime-cream-warm">
                  Our AI weaves a magical tale featuring your child's favorite things
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-bedtime-yellow text-bedtime-purple-dark flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h4 className="text-lg font-bold text-bedtime-yellow mb-2">
                  Make choices together
                </h4>
                <p className="text-bedtime-cream-warm">
                  Your child decides what happens next, learning valuable lessons along the way
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center pb-16">
          <button
            onClick={() => navigate('/create')}
            className="btn-primary text-xl px-12 py-4"
          >
            <span className="flex items-center justify-center gap-3">
              <span>🌙</span>
              <span>Start Your Story</span>
              <span>✨</span>
            </span>
          </button>

          <p className="text-bedtime-cream/60 mt-6">
            Perfect for ages 3-12 • Free to use • New story every time
          </p>
        </div>

        {/* Sample Characters */}
        <div className="bedtime-card mb-12">
          <h2 className="bedtime-card-header justify-center">
            <span className="star">🎭</span>
            <span>Try Our Sample Characters</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-bedtime-blue-midnight/50 rounded-xl p-6 border-2 border-bedtime-purple-light/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🏃</div>
                <div>
                  <h4 className="text-xl font-bold text-bedtime-yellow mb-2">
                    Arjun, Age 8
                  </h4>
                  <p className="text-bedtime-cream-warm mb-3">
                    Loves sports, jungle adventures, and monkeys. Learning about honesty.
                  </p>
                  <button
                    onClick={() => navigate('/create?preset=arjun')}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Start Arjun's Story
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-bedtime-blue-midnight/50 rounded-xl p-6 border-2 border-bedtime-purple-light/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🌌</div>
                <div>
                  <h4 className="text-xl font-bold text-bedtime-yellow mb-2">
                    Maya, Age 7
                  </h4>
                  <p className="text-bedtime-cream-warm mb-3">
                    Dreams of space, stars, and drawing. Learning about kindness.
                  </p>
                  <button
                    onClick={() => navigate('/create?preset=maya')}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Start Maya's Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-bedtime-cream/50 text-sm mb-2">
            Powered by AI magic and imagination
          </p>
          <div className="flex justify-center gap-2 text-2xl">
            <span className="animate-pulse">⭐</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>✨</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>🌙</span>
            <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>⭐</span>
            <span className="animate-pulse" style={{ animationDelay: '0.8s' }}>✨</span>
          </div>
        </div>
      </div>
    </div>
  );
};
