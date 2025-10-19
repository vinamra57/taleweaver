import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  DinoIllustration,
  RocketIllustration,
  BookIllustration,
  MoonIllustration,
  StarIllustration,
  HeartIllustration,
  TeddyBearIllustration,
  BallIllustration,
  BuildingBlockIllustration,
  CarIllustration,
  SmallDinoIllustration,
  ButterflyIllustration,
} from '../components/Illustrations';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute top-10 left-10 opacity-30 animate-float">
        <SmallDinoIllustration className="w-20 h-20" />
      </div>
      <div className="absolute top-20 right-20 opacity-40 animate-float" style={{ animationDelay: '0.5s' }}>
        <MoonIllustration className="w-24 h-24" />
      </div>
      <div className="absolute top-40 left-1/4 opacity-25 animate-float" style={{ animationDelay: '1s' }}>
        <StarIllustration className="w-12 h-12" color="#F9C97C" />
      </div>
      <div className="absolute top-60 right-1/3 opacity-30 animate-float" style={{ animationDelay: '1.5s' }}>
        <BallIllustration className="w-16 h-16" />
      </div>
      <div className="absolute bottom-40 left-16 opacity-25 animate-float" style={{ animationDelay: '0.7s' }}>
        <TeddyBearIllustration className="w-24 h-24" />
      </div>
      <div className="absolute bottom-60 right-24 opacity-30 animate-float" style={{ animationDelay: '2s' }}>
        <BuildingBlockIllustration className="w-20 h-20" />
      </div>
      <div className="absolute top-1/3 right-12 opacity-25 animate-float" style={{ animationDelay: '1.2s' }}>
        <ButterflyIllustration className="w-16 h-16" />
      </div>
      <div className="absolute bottom-1/4 left-1/3 opacity-30 animate-float" style={{ animationDelay: '0.3s' }}>
        <CarIllustration className="w-24 h-24" />
      </div>
      <div className="absolute top-1/2 left-12 opacity-20 animate-float" style={{ animationDelay: '1.8s' }}>
        <StarIllustration className="w-10 h-10" color="#B4A5D5" />
      </div>
      <div className="absolute bottom-32 right-1/4 opacity-25 animate-float" style={{ animationDelay: '0.9s' }}>
        <SmallDinoIllustration className="w-16 h-16" />
      </div>

      <div className="container-bedtime relative z-10">
        {/* Auth buttons in header */}
        <div className="pt-4 flex justify-end gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-bedtime-purple font-body self-center">Hello, {user?.name}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center pt-20 pb-16">
          <div className="mb-8 flex justify-center">
            <BookIllustration className="w-32 h-32 animate-float" />
          </div>

          <h1 className="text-7xl md:text-8xl mb-6 text-bedtime-purple font-display font-semibold">
            TaleWeaver
          </h1>

          <p className="text-3xl md:text-4xl text-bedtime-purple-dark font-display font-normal mb-4">
            Magical Bedtime Stories
          </p>

          <p className="text-xl text-bedtime-purple max-w-2xl mx-auto font-body mb-8">
            Personalized tales that teach empathy, kindness, and important life lessons
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/create')}
              className="btn-primary text-xl inline-flex items-center gap-3 justify-center"
            >
              <StarIllustration className="w-6 h-6" color="white" />
              <span>Start Your Story</span>
              <StarIllustration className="w-6 h-6" color="white" />
            </button>
            <button
              onClick={() => navigate('/create-song')}
              className="btn-secondary text-xl inline-flex items-center gap-3 justify-center"
            >
              <span role="img" aria-label="music">🎵</span>
              <span>Compose a Song</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bedtime-card text-center hover:shadow-xl transition-shadow duration-300">
            <div className="flex justify-center mb-4">
              <HeartIllustration className="w-20 h-20" />
            </div>
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-3">
              Personalized
            </h3>
            <p className="text-bedtime-purple-dark font-body leading-relaxed">
              Stories tailored to your child's age, interests, and unique experiences
            </p>
          </div>

          <div className="bedtime-card text-center hover:shadow-xl transition-shadow duration-300">
            <div className="flex justify-center mb-4">
              <BookIllustration className="w-20 h-20" />
            </div>
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-3">
              Educational
            </h3>
            <p className="text-bedtime-purple-dark font-body leading-relaxed">
              Teaching important values like honesty, courage, and empathy through storytelling
            </p>
          </div>

          <div className="bedtime-card text-center hover:shadow-xl transition-shadow duration-300">
            <div className="flex justify-center mb-4">
              <RocketIllustration className="w-20 h-20" />
            </div>
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-3">
              Interactive & Musical
            </h3>
            <p className="text-bedtime-purple-dark font-body leading-relaxed">
              Your child makes choices in stories or enjoys a personalized lullaby built just for them
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bedtime-card mb-16 max-w-4xl mx-auto">
          <h2 className="text-4xl font-display font-medium text-bedtime-purple text-center mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bedtime-yellow text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-display font-medium text-bedtime-purple mb-3">
                  Tell us about your child
                </h4>
                <p className="text-bedtime-purple-dark font-body text-lg leading-relaxed">
                  Share their name, age, interests, and what you'd like them to learn today
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bedtime-purple text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-display font-medium text-bedtime-purple mb-3">
                  AI creates a unique story
                </h4>
                <p className="text-bedtime-purple-dark font-body text-lg leading-relaxed">
                  Our AI weaves a magical tale featuring your child's favorite things and characters
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bedtime-green-soft text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
                3
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-display font-medium text-bedtime-purple mb-3">
                  Make choices together
                </h4>
                <p className="text-bedtime-purple-dark font-body text-lg leading-relaxed">
                  Your child decides what happens next, learning valuable lessons along the way
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Characters */}
        <div className="mb-16">
          <h2 className="text-4xl font-display font-medium text-bedtime-purple text-center mb-12">
            Try Our Sample Characters
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bedtime-card hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <DinoIllustration className="w-24 h-24" />
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-display font-medium text-bedtime-purple mb-2">
                    Arjun, Age 8
                  </h4>
                  <p className="text-bedtime-purple-dark font-body mb-4 leading-relaxed">
                    Loves sports, jungle adventures, and monkeys. Learning about honesty.
                  </p>
                  <button
                    onClick={() => navigate('/create?preset=arjun')}
                    className="btn-secondary w-full"
                  >
                    Start Arjun's Story
                  </button>
                </div>
              </div>
            </div>

            <div className="bedtime-card hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <RocketIllustration className="w-24 h-24" />
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-display font-medium text-bedtime-purple mb-2">
                    Maya, Age 7
                  </h4>
                  <p className="text-bedtime-purple-dark font-body mb-4 leading-relaxed">
                    Dreams of space, stars, and drawing. Learning about kindness.
                  </p>
                  <button
                    onClick={() => navigate('/create?preset=maya')}
                    className="btn-secondary w-full"
                  >
                    Start Maya's Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center pb-20">
          <div className="bedtime-card max-w-3xl mx-auto bg-gradient-to-br from-bedtime-purple-pale to-bedtime-blue-soft">
            <h2 className="text-4xl font-display font-medium text-bedtime-purple mb-6">
              Ready for a Magical Adventure?
            </h2>
            <p className="text-xl text-bedtime-purple-dark font-body mb-8">
              Create a personalized bedtime story in just a few minutes
            </p>
            <button
              onClick={() => navigate('/create')}
              className="btn-primary text-2xl px-12 py-5"
            >
              Create Your Story Now
            </button>
            <p className="text-bedtime-purple/70 font-body mt-6 text-sm">
              Perfect for ages 3-12 • Free to use • New story every time
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <p className="text-bedtime-purple/60 font-body mb-4">
            Powered by AI magic and imagination ✨
          </p>
          <div className="flex justify-center gap-3">
            {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
              <div key={i} className="animate-pulse" style={{ animationDelay: `${delay}s` }}>
                <StarIllustration className="w-6 h-6" color="#F9C97C" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
