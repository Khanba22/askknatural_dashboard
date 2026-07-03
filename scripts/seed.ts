import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error('ERROR: MONGO_URL not set in .env');
  process.exit(1);
}

// Define Mongoose schemas inline for standalone script execution
const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  orderIndex: { type: Number, default: 0 },
});

const QuestionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'single_option', 'multi_option'], default: 'single_option' },
  enforced: { type: Boolean, default: false },
  orderIndex: { type: Number, default: 0 },
  options: [OptionSchema],
});

const QuizSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  homeOptionText: { type: String, default: null },
  description: { type: String, default: null },
  outputUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  orderIndex: { type: Number, default: 0 },
});

const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);

interface SeedQuiz {
  name: string;
  slug: string;
  homeOptionText: string;
  description: string;
  outputUrl: string;
  orderIndex: number;
  questions: {
    text: string;
    type?: 'text' | 'single_option' | 'multi_option';
    enforced?: boolean;
    options: string[];
  }[];
}

const QUIZZES_TO_SEED: SeedQuiz[] = [
  {
    name: 'PCOS & Hormonal Imbalance Assessment',
    slug: 'pcos-hormonal-imbalance',
    homeOptionText: 'PCOS / Hormonal imbalance',
    description: 'Comprehensive assessment for cycle regularity, androgen symptoms, and hormone balance.',
    outputUrl: '/products/recycle',
    orderIndex: 0,
    questions: [
      {
        text: 'How regular are your periods?',
        options: ['Regular', 'Irregular', 'Very unpredictable', 'Not sure'],
      },
      {
        text: 'What is your age range?',
        options: ['Under 25', '25-34', '35-44', '45+'],
      },
      {
        text: 'How long have you been dealing with this?',
        options: ['Recently', 'A few months', 'Years'],
      },
      {
        text: 'Do you notice any of these? (Select all that apply)',
        type: 'multi_option',
        options: ['Acne', 'Excess hair growth', 'Hair thinning', 'None of these'],
      },
      {
        text: 'Do you notice mood swings or low mood tied to your cycle?',
        options: ['Yes, strongly', 'Sometimes', 'Not really'],
      },
      {
        text: 'Do you get period pain or heavy bleeding that disrupts your day?',
        options: ['Yes, often', 'Occasionally', 'No'],
      },
      {
        text: "What's the one outcome you want most right now?",
        options: [
          'Regular cycles',
          'Clearer skin',
          'Better mood',
          'Better sleep',
          "Just understanding what's going on",
        ],
      },
    ],
  },
  {
    name: 'Menopause & Perimenopause Assessment',
    slug: 'menopause-perimenopause',
    homeOptionText: 'Menopause',
    description: 'Evaluate period changes, hot flashes, sleep disturbances, and perimenopausal symptoms.',
    outputUrl: '', // Empty triggers "Talk to an expert" screen
    orderIndex: 1,
    questions: [
      {
        text: 'Have your periods become irregular, lighter/heavier, or stopped completely?',
        options: ['Yes, changed', 'Stopped completely', 'Still regular'],
      },
      {
        text: 'What is your age range?',
        options: ['Under 40', '40-45', '46-50', '50+'],
      },
      {
        text: 'Are you experiencing hot flashes or night sweats?',
        options: ['Yes, often', 'Occasionally', 'No'],
      },
      {
        text: 'How is your sleep most nights?',
        options: ['Poor', 'Okay', 'Good'],
      },
      {
        text: 'Do you notice mood changes, anxiety, or brain fog?',
        options: ['Yes, strongly', 'Sometimes', 'Not really'],
      },
      {
        text: 'What are you currently taking?',
        options: ['HRT', 'Other supplements', 'Nothing yet'],
      },
      {
        text: "What's bothering you most right now?",
        options: ['Hot flashes', 'Sleep', 'Mood', 'Low energy', "Just understanding what's happening"],
      },
    ],
  },
  {
    name: 'Sleep Optimization Assessment',
    slug: 'sleep-optimization',
    homeOptionText: 'Sleep issues',
    description: 'Assess trouble falling or staying asleep, night sweats, and wind-down habits.',
    outputUrl: '', // Empty triggers "Talk to an expert" screen
    orderIndex: 2,
    questions: [
      {
        text: 'Do you have trouble falling asleep, staying asleep, or both?',
        options: ['Falling asleep', 'Staying asleep', 'Both'],
      },
      {
        text: 'What is your age range?',
        options: ['Under 25', '25-34', '35-44', '45+'],
      },
      {
        text: 'Is your sleep worse around certain points in your cycle, or fairly constant?',
        options: ['Cycle-linked', 'Constant'],
      },
      {
        text: 'Do you wake up due to night sweats or heat?',
        options: ['Yes', 'No'],
      },
      {
        text: 'How many caffeinated drinks do you typically consume per day?',
        options: ['None', '1-2 cups (morning only)', '3+ cups or afternoon/evening coffee'],
      },
      {
        text: 'How do you usually spend the hour before falling asleep?',
        options: ['Looking at phone / screens', 'Watching TV / working', 'Relaxing / reading / wind-down routine'],
      },
      {
        text: 'What is your top priority for improving your sleep right now?',
        options: [
          'Falling asleep faster',
          'Sleeping through the night without waking',
          'Waking up feeling refreshed and energized',
        ],
      },
    ],
  },
  {
    name: 'General Wellness Exploration',
    slug: 'general-wellness-exploring',
    homeOptionText: 'Just exploring',
    description: 'Soft exploratory assessment to help route you to the right hormonal or wellness routine.',
    outputUrl: '', // Empty triggers "Talk to an expert" screen
    orderIndex: 3,
    questions: [
      {
        text: "What best describes what you'd like to explore today?",
        options: [
          'Hormonal health & PCOS support',
          'Menopause & perimenopause transitions',
          'Sleep optimization & night sweats',
          'General wellness & daily vitality',
        ],
      },
      {
        text: 'How would you rate your daily energy levels?',
        options: ['High and consistent', 'Moderate with afternoon crashes', 'Low throughout the day'],
      },
      {
        text: 'Would you like our wellness experts to help you identify the right starting point?',
        options: ['Yes, connect me with an expert', "I'm just browsing for now"],
      },
    ],
  },
];

async function seed() {
  console.log('Connecting to MongoDB (asknatural_quizzes)...');
  await mongoose.connect(MONGO_URL!, { dbName: 'asknatural_quizzes' });
  console.log('Connected!');

  for (const qData of QUIZZES_TO_SEED) {
    console.log(`\nProcessing Quiz: "${qData.name}" (${qData.slug})...`);
    
    // Check if quiz exists
    let quiz = await Quiz.findOne({ slug: qData.slug });
    if (!quiz) {
      quiz = await Quiz.create({
        name: qData.name,
        slug: qData.slug,
        homeOptionText: qData.homeOptionText,
        description: qData.description,
        outputUrl: qData.outputUrl,
        isActive: true,
        orderIndex: qData.orderIndex,
      });
      console.log(` -> Created Quiz ID: ${quiz._id}`);
    } else {
      quiz.name = qData.name;
      quiz.homeOptionText = qData.homeOptionText;
      quiz.description = qData.description;
      quiz.outputUrl = qData.outputUrl;
      quiz.orderIndex = qData.orderIndex;
      quiz.isActive = true;
      await quiz.save();
      console.log(` -> Updated Quiz ID: ${quiz._id}`);
    }

    // Delete existing questions for this quiz to ensure a clean seed
    await Question.deleteMany({ quizId: quiz._id });
    console.log(` -> Cleared existing questions.`);

    // Insert questions
    for (let i = 0; i < qData.questions.length; i++) {
      const q = qData.questions[i];
      const options = q.options.map((optText, optIdx) => ({
        text: optText,
        orderIndex: optIdx,
      }));

      await Question.create({
        quizId: quiz._id,
        text: q.text,
        type: q.type || 'single_option',
        enforced: q.enforced ?? true,
        orderIndex: i,
        options,
      });
    }
    console.log(` -> Seeded ${qData.questions.length} questions.`);
  }

  console.log('\n✅ Seeding complete! Closing DB connection...');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
