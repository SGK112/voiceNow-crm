import express from 'express';
import { protect as auth } from '../middleware/auth.js';

const router = express.Router();

// Mock AI generation - In production, integrate with OpenAI or similar
const generateSocialPost = async (platform, tone, contentType, customPrompt, imageUrl, projectDetails) => {
  // Platform-specific configurations
  const platformConfigs = {
    instagram: {
      maxLength: 2200,
      hashtagCount: 15,
      style: 'visual-focused',
      includeEmojis: true
    },
    facebook: {
      maxLength: 500,
      hashtagCount: 3,
      style: 'community-focused',
      includeEmojis: true
    },
    twitter: {
      maxLength: 280,
      hashtagCount: 2,
      style: 'concise',
      includeEmojis: false
    },
    linkedin: {
      maxLength: 700,
      hashtagCount: 5,
      style: 'professional',
      includeEmojis: false
    }
  };

  const config = platformConfigs[platform] || platformConfigs.instagram;

  // Generate caption based on content type and tone
  let caption = '';
  let hashtags = [];
  let cta = '';

  // Content type templates
  const templates = {
    'before-after': {
      caption: `${config.includeEmojis ? '✨ ' : ''}Transform your space with stunning results! ${customPrompt ? customPrompt + ' ' : ''}This ${projectDetails.title || 'project'} showcases the incredible potential of professional remodeling. Swipe to see the amazing before and after transformation!`,
      hashtags: ['transformation', 'beforeandafter', 'remodeling', 'homeimprovement', 'renovation'],
      cta: 'Ready to transform your space? DM us for a free consultation!'
    },
    'project-showcase': {
      caption: `${config.includeEmojis ? '🏆 ' : ''}Proud to share our latest project! ${customPrompt || ''} Every detail was carefully crafted to bring this vision to life. ${projectDetails.description || ''}`,
      hashtags: ['newproject', 'portfolio', 'craftsmanship', 'design', 'remodel'],
      cta: 'Love what you see? Let\'s discuss your project today!'
    },
    'tips-advice': {
      caption: `${config.includeEmojis ? '💡 ' : ''}Pro tip: ${customPrompt || 'Quality materials make all the difference in your remodeling project.'} Here's what we've learned from years of experience in the industry.`,
      hashtags: ['protips', 'homeadvice', 'remodelingtips', 'diy', 'expertise'],
      cta: 'Want more tips? Follow us for expert advice!'
    },
    'behind-scenes': {
      caption: `${config.includeEmojis ? '🎬 ' : ''}Behind the scenes of our latest project! ${customPrompt || ''} See how we bring designs to life with precision and care. ${projectDetails.description || ''}`,
      hashtags: ['behindthescenes', 'construction', 'worklife', 'craftsmen', 'process'],
      cta: 'Interested in seeing your project come to life? Contact us!'
    },
    'client-testimonial': {
      caption: `${config.includeEmojis ? '⭐ ' : ''}Our clients' satisfaction is our top priority! "${customPrompt || 'Working with this team was an amazing experience. Highly recommended!'}" Thank you for trusting us with your ${projectDetails.title || 'project'}!`,
      hashtags: ['clientlove', 'testimonial', 'review', 'satisfaction', 'trusted'],
      cta: 'Join our happy clients! Book your consultation today.'
    },
    'seasonal-promo': {
      caption: `${config.includeEmojis ? '🎉 ' : ''}Limited time offer! ${customPrompt || 'Special pricing on all remodeling projects this season.'} Don't miss this opportunity to transform your space at an incredible value!`,
      hashtags: ['sale', 'promotion', 'limitedtime', 'deal', 'offer'],
      cta: 'Claim this offer before it expires - DM us now!'
    }
  };

  const template = templates[contentType] || templates['project-showcase'];

  // Adjust caption based on tone
  if (tone === 'casual') {
    caption = template.caption.replace(/!/g, '!!').replace(/\./g, '!');
  } else if (tone === 'excited') {
    caption = template.caption.replace(/\./g, '! 🎉');
  } else if (tone === 'educational') {
    caption = `Did you know? ${template.caption}`;
  } else if (tone === 'promotional') {
    caption = `SPECIAL OFFER: ${template.caption} Limited spots available!`;
  } else {
    caption = template.caption;
  }

  // Truncate if needed
  if (caption.length > config.maxLength) {
    caption = caption.substring(0, config.maxLength - 3) + '...';
  }

  // Generate hashtags
  hashtags = template.hashtags.slice(0, config.hashtagCount || 15);

  // Add industry-specific hashtags
  hashtags.push('construction', 'contractor', 'homedesign', 'interiordesign');
  hashtags = [...new Set(hashtags)].slice(0, config.hashtagCount || 15);

  // Best time to post (simplified)
  const bestTimes = {
    instagram: 'Weekdays 11am-1pm or 7pm-9pm',
    facebook: 'Weekdays 1pm-3pm',
    twitter: 'Weekdays 12pm-3pm',
    linkedin: 'Tuesday-Thursday 10am-12pm'
  };

  return {
    caption,
    hashtags,
    cta: template.cta,
    bestTimeToPost: bestTimes[platform] || bestTimes.instagram,
    platform,
    characterCount: caption.length,
    hashtagCount: hashtags.length
  };
};

// Generate social media post
router.post('/generate-social-post', auth, async (req, res) => {
  try {
    const { platform, tone, contentType, customPrompt, imageUrl, projectDetails } = req.body;

    if (!platform || !tone || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Platform, tone, and contentType are required'
      });
    }

    const generatedPost = await generateSocialPost(
      platform,
      tone,
      contentType,
      customPrompt,
      imageUrl,
      projectDetails || {}
    );

    res.json({
      success: true,
      ...generatedPost
    });
  } catch (error) {
    console.error('Error generating social post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate social media post',
      error: error.message
    });
  }
});

// Get platform guidelines
router.get('/platform-guidelines', auth, async (req, res) => {
  try {
    const guidelines = {
      instagram: {
        maxCaptionLength: 2200,
        maxHashtags: 30,
        recommendedHashtags: 15,
        imageRequired: true,
        bestFormats: ['Square (1:1)', 'Portrait (4:5)', 'Stories (9:16)'],
        bestTimes: ['Weekdays 11am-1pm', 'Weekdays 7pm-9pm']
      },
      facebook: {
        maxCaptionLength: 63206,
        maxHashtags: null,
        recommendedHashtags: 3,
        imageRequired: false,
        bestFormats: ['Landscape (16:9)', 'Square (1:1)'],
        bestTimes: ['Weekdays 1pm-3pm', 'Weekends 12pm-1pm']
      },
      twitter: {
        maxCaptionLength: 280,
        maxHashtags: null,
        recommendedHashtags: 2,
        imageRequired: false,
        bestFormats: ['Landscape (16:9)', 'Square (1:1)'],
        bestTimes: ['Weekdays 12pm-3pm', 'Weekdays 5pm-6pm']
      },
      linkedin: {
        maxCaptionLength: 3000,
        maxHashtags: null,
        recommendedHashtags: 5,
        imageRequired: false,
        bestFormats: ['Landscape (1.91:1)', 'Square (1:1)'],
        bestTimes: ['Tuesday-Thursday 10am-12pm', 'Tuesday-Thursday 5pm-6pm']
      }
    };

    res.json({
      success: true,
      guidelines
    });
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform guidelines',
      error: error.message
    });
  }
});

export default router;
