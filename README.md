# TaleWeaver

An AI-powered bedtime story platform that generates personalized, interactive narratives for children aged 3-12. TaleWeaver combines cutting-edge AI services to create immersive educational experiences that teach moral values through storytelling, featuring voice cloning, custom narrator generation, and AI-composed music.

## Inspiration

Every parent knows the challenge of bedtime stories: How do you create engaging, educational content that reflects your child's unique interests while teaching important values? Generic storybooks can't adapt to individual learning needs or incorporate personal touches that make stories truly special.

TaleWeaver bridges this gap by empowering parents with AI technology. It creates unique, age-appropriate stories that adapt to each child's interests while naturally weaving in lessons about kindness, honesty, courage, and more. By supporting voice cloning, parents can narrate stories in their own voice even when they can't be present, maintaining that irreplaceable emotional connection.

## What It Does

### Interactive Story Generation

TaleWeaver offers two storytelling experiences:

**Interactive Mode**: Children make meaningful choices at 1-3 decision points that branch the narrative. Choices are designed with educational intent - one option demonstrates positive values (growth-oriented) while alternatives present valid but less ideal paths. This gentle approach teaches without punishment, encouraging reflection on consequences.

**Non-Interactive Mode**: Continuous narrative experience (1-3 minutes) perfect for younger children or bedtime winding down.

Every story is:
- Age-customized with appropriate vocabulary (4-6, 7-9, 10-12 age groups)
- Personalized to the child's name and interests
- Focused on a chosen moral value (kindness, honesty, courage, sharing, perseverance)
- Narrated with emotion-aware voice modulation

### Voice Personalization

**Custom Voice Generation**: TaleWeaver uses ElevenLabs Voice Design API to generate unique narrator voices from text descriptions. Each story gets its own character voice (princess, scientist, pirate, coach, explorer, or AI-generated).

**Voice Cloning**: Parents can record and clone their own voice using ElevenLabs Instant Voice Clone. This breakthrough feature allows parents to narrate bedtime stories in their own voice even when traveling, working late, or otherwise unable to be present - maintaining emotional connection and routine.

**Pre-set Voices**: Professional voice options available for immediate use.

### AI-Composed Music

Create personalized songs and lullabies with:
- Multiple song types (song, rhyme, instrumental)
- Themes (bedtime, adventure, learning, celebration, friendship)
- Musical styles (lullaby, pop, folk, classical, jazz)
- Configurable durations (30s, 60s, 2min)
- AI-generated composition plans for musical coherence

### Educational Value

After each story, TaleWeaver uses Google Gemini to generate reflections that help parents discuss the story with their child, reinforcing learning and creating meaningful conversations.

## How We Built It

### Architecture Overview

TaleWeaver is a full-stack application built entirely on Cloudflare's edge infrastructure:

**Frontend**:
- React 18 + TypeScript for type-safe component development
- React Router for seamless navigation
- Tailwind CSS for responsive design
- Zod for runtime validation
- Vite for optimized builds

**Backend**:
- Cloudflare Workers with Hono framework for serverless API
- Cloudflare Durable Objects with SQLite backing for persistent state
- Cloudflare KV for low-latency session caching
- Cloudflare R2 for cost-effective audio storage

### AI & Voice Services

**Google Gemini API (2.5 Flash)**:
- Two-phase story generation:
  - Phase 1: Generate detailed story prompts from user inputs
  - Phase 2: Generate age-appropriate story segments with emotion hints
- Song prompt generation with composition planning
- Post-story educational reflections

**ElevenLabs APIs**:
- Text-to-Speech with Multilingual V2 model for emotion-rich narration
- Voice Design API for generating unique narrator voices from descriptions
- Instant Voice Clone for parent voice recording
- Music Generation API (music_v1) for personalized songs

### Innovative Technical Implementations

**Asynchronous Branch Generation**: The system generates the first story segment and returns it immediately while processing branching paths in the background. Frontend polling detects when branches are ready, creating a seamless "instant choice" experience despite complex AI generation.

```
User listens to segment (~1-2 min audio)
  ↓
Backend asynchronously generates 2 branches
  ↓
By the time audio ends, choices are ready
  ↓
Zero perceived wait time
```

**Adaptive Content Generation**: Gemini generates story segments with precise constraints:
- Word count calculated from requested duration
- Age-specific vocabulary guidelines (e.g., 4-6: simple sentences, present tense)
- Emotion hints for voice modulation (warm, curious, tense, relieved)
- Moral focus integration without being preach

**Hybrid State Management**:
- Durable Objects provide SQLite-backed persistence for users, profiles, stories
- KV caching optimizes high-frequency reads (session data, branch status)
- R2 stores audio files with efficient URL-based delivery
- Hierarchical key structure for efficient queries

**Voice Personalization Pipeline**:
1. Gemini generates narrator voice description from story context
2. Voice Design API creates the voice
3. Voice ID stored in session for consistent narration
4. Fallback to default voice ensures reliability

## Challenges We Ran Into

**Latency Management**: Initial implementations had users waiting 15-20 seconds between story segments. We solved this with:
- Asynchronous branch generation using `c.executionCtx.waitUntil()`
- Frontend polling architecture
- Strategic caching with KV
- Parallel API calls where possible

**Voice Quality Consistency**: Ensuring emotional tone matched story context required careful tuning of ElevenLabs stability/similarity settings and experimentation with emotion hint formats.

**Age-Appropriate Content**: Creating a prompt system that reliably generates vocabulary-appropriate content for different age groups required iterative refinement. We implemented explicit vocabulary guidelines in prompts (e.g., "Use only present and simple past tense" for 4-6 age group).

**State Persistence**: Managing interactive story sessions with multiple branches required thoughtful database schema design in Durable Objects. We implemented a hierarchical key structure that supports efficient queries while maintaining referential integrity.

**Audio Storage**: Initial approach of embedding audio in responses hit size limits. Migration to R2 with URL-based delivery solved this while reducing bandwidth costs.

## Accomplishments That We're Proud Of

**Seamless UX**: The polling architecture creates the illusion of instant branch generation. Users experience zero perceived wait time between segments.

**Educational Design**: Choices are carefully designed to be growth-oriented rather than punitive. Children learn through gentle consequences and positive reinforcement.

**Voice Cloning for Connection**: Enabling parents to narrate stories in their own voice - even when absent - is powerful. This feature has genuine potential to maintain family bonds and routines during separations.

**Multi-Service Integration**: Successfully orchestrating Gemini, ElevenLabs (TTS, Voice Design, Cloning, Music), Cloudflare Workers, Durable Objects, KV, and R2 into a cohesive experience.

**Type Safety**: Full-stack TypeScript with Zod validation ensures robust error handling and developer experience.

**Scalability**: Cloudflare's edge infrastructure means TaleWeaver can scale globally with minimal operational overhead.

## What We Learned

**Prompt Engineering is Critical**: The quality of AI-generated content is directly tied to prompt specificity. We learned to provide explicit constraints (word counts, vocabulary lists, emotion hints) rather than relying on vague instructions.

**Async Patterns for AI**: AI API calls have variable latency. Building applications that feel responsive requires creative async patterns and strategic use of background processing.

**Voice Design Nuances**: Text-to-speech quality depends on many factors beyond the text itself - voice selection, stability settings, similarity settings, and even punctuation placement affect emotional delivery.

**Edge Computing Power**: Cloudflare Durable Objects proved surprisingly powerful for stateful applications. SQLite backing provides query flexibility while maintaining edge performance.

**Audio Format Considerations**: MP3 works across browsers, but format selection affects file size and quality. We optimized for 128kbps as the sweet spot for voice content.

## What's Next for TaleWeaver

**Expanded Languages**: Leverage ElevenLabs Multilingual V2 for stories in Spanish, French, Mandarin, and more.

**Collaborative Stories**: Enable siblings to make choices together, teaching cooperation and negotiation.

**Learning Analytics**: Provide parents with insights into their child's choice patterns and areas of growth.

**Story Templates**: Pre-built story frameworks from child development experts for specific learning goals.

**Voice Library**: Community-contributed narrator voices (with proper consent/licensing).

**Illustration Generation**: Add AI-generated images that illustrate key story moments.

**Parent Dashboard**: Track story history, favorite themes, moral values reinforced, and developmental milestones.

**Accessibility Features**: Screen reader optimization, text display alongside audio, adjustable playback speed.

**Bedtime Routine Integration**: Connect with smart home devices to gradually dim lights as stories progress, transition to white noise after completion.

## Built With

- Google Gemini API (2.5 Flash)
- ElevenLabs Text-to-Speech (Multilingual V2)
- ElevenLabs Voice Design
- ElevenLabs Instant Voice Clone
- ElevenLabs Music Generation
- Cloudflare Workers
- Cloudflare Durable Objects
- Cloudflare KV
- Cloudflare R2
- React 18 + TypeScript
- Hono Web Framework
- Tailwind CSS
- Vite

## Hackathon Tracks

TaleWeaver was built for:

**GROW - The Advocate (Main Track)**: TaleWeaver strengthens family bonds and empowers childhood development through personalized, educational storytelling. It supports parents in teaching values, maintains emotional connections through voice cloning, and fosters learning through interactive choices.

**MLH: Best Use of ElevenLabs**: Comprehensive integration of ElevenLabs' full suite - TTS for narration, Voice Design for custom voices, Instant Voice Clone for parent voices, and Music Generation for personalized lullabies.

**MLH: Best AI Application Built with Cloudflare**: Built entirely on Cloudflare's platform using Workers, Durable Objects, KV, and R2 to create a scalable, edge-deployed AI storytelling experience.

**MLH: Best Use of AI powered by Reach Capital**: TaleWeaver transforms learning through AI-powered personalized education. Stories teach moral values, develop decision-making skills, and adapt to each child's developmental stage.

**MLH: Best Use of Gemini API**: Gemini powers story generation, adaptive content creation, composition planning, and educational reflections - demonstrating creative AI applications beyond simple chatbots.

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- ElevenLabs API key
- Google Gemini API key

### Backend Setup

1. Navigate to worker directory:
```bash
cd worker
```

2. Install dependencies:
```bash
npm install
```

3. Create `.dev.vars` file with your API keys:
```
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

4. Run migrations:
```bash
npx wrangler d1 migrations apply taleweaver-db --local
```

5. Start development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update API endpoint in `src/lib/api.ts` if needed

4. Start development server:
```bash
npm run dev
```

### Deployment

**Backend**:
```bash
cd worker
npm run deploy
```

**Frontend**:
```bash
cd frontend
npm run build
# Deploy dist folder to your hosting provider
```

## Environment Variables

### Backend (worker/.dev.vars)
- `GEMINI_API_KEY`: Google Gemini API key
- `ELEVENLABS_API_KEY`: ElevenLabs API key

### Cloudflare Bindings (configured in wrangler.toml)
- `USER_DURABLE_OBJECT`: Durable Object binding
- `KV`: KV namespace binding
- `AUDIO_BUCKET`: R2 bucket binding

## License

MIT

## Contact

Built with care for children's learning and family connection.
