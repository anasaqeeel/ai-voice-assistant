# Voice AI Assistant

A premium voice AI assistant application with multiple AI personalities, real-time voice processing, and professional UI animations.

## Features

- 🎤 **Real-time Voice Chat** - Natural conversations with AI assistants
- 🤖 **Multiple AI Personalities** - Maya (Professional), Miles (Creative), Sophia (Wise), Alex (Technical), Luna (Supportive)
- 🎨 **Animated Voice Indicators** - Beautiful real-time visual feedback
- 🔊 **Premium Voice Synthesis** - OpenAI TTS and ElevenLabs integration
- 📱 **Mobile-First Design** - Responsive and touch-friendly interface
- 🔒 **Privacy-Focused** - No permanent storage of voice data

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Framer Motion
- **Voice Processing**: OpenAI Whisper (STT), OpenAI TTS / ElevenLabs (TTS)
- **AI**: OpenAI GPT-4o-mini with custom personality prompts
- **Deployment**: Vercel (recommended)

## Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <your-repo>
cd voice-ai-assistant
npm install
\`\`\`

### 2. Environment Setup

Create a `.env.local` file:

\`\`\`env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for premium voices)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
\`\`\`

### 3. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Keys Setup

### OpenAI API Key (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env.local` as `OPENAI_API_KEY`

### ElevenLabs API Key (Optional)
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up and get your API key
3. Add it to your `.env.local` as `ELEVENLABS_API_KEY`

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

\`\`\`bash
npm run build
npm start
\`\`\`

## Browser Compatibility

- Chrome 80+ (recommended)
- Firefox 75+
- Safari 14+
- Edge 80+

**Note**: Microphone access requires HTTPS in production.

## Usage

1. **Grant Microphone Permission** - Required for voice chat
2. **Select AI Personality** - Choose from 5 unique assistants
3. **Start Conversation** - Tap the call button to begin
4. **Voice Chat** - Hold the mic button to speak, release to send
5. **Switch Voices** - Toggle between OpenAI and ElevenLabs TTS

## AI Personalities

- **Maya** 👩‍💼 - Professional & Empathetic (Business Strategy)
- **Miles** 👨‍🎨 - Creative & Inspiring (Creative Arts)
- **Sophia** 👩‍🏫 - Wise & Calming (Education & Growth)
- **Alex** 👨‍💻 - Tech-Savvy & Analytical (Technology)
- **Luna** 👩‍⚕️ - Friendly & Supportive (Wellness)

## Troubleshooting

### Microphone Issues
- Ensure HTTPS in production
- Check browser permissions
- Try refreshing the page

### API Errors
- Verify API keys are correct
- Check API usage limits
- Ensure network connectivity

### Performance
- Use Chrome for best performance
- Close other tabs using microphone
- Check internet connection speed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Open a GitHub issue
- Contact support team

---

Built with ❤️ using Next.js and OpenAI
