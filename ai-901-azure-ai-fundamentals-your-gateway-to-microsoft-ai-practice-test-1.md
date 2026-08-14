# AI-901 Azure AI Fundamentals: Your Gateway to Microsoft AI — Practice Test 1

> **Time Limit:** 90 minutes
> **Questions:** 45
> **Passing Score:** 700/1000 (70%)
> **Generated:** 4/24/2026

---

## Instructions

- Read each question carefully
- Choose the BEST answer
- All questions are equally weighted
- Do not spend too long on any single question

---

## Questions

### Question 1
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** easy

What is the purpose of 'intents' in conversational AI systems?

- A) To store user passwords securely
- B) To represent the goal or purpose behind a user's message
- C) To format the bot's responses in different languages
- D) To measure the bot's response time

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Intents represent what the user is trying to accomplish or the purpose of their message. For example, 'BookFlight' or 'CheckOrderStatus' are intents that help the bot understand and respond appropriately to user goals.

**Why not A:** Password storage is a security function, not related to natural language understanding.

**Why not C:** Language formatting is localization, separate from intent recognition.

**Why not D:** Response time measurement is performance monitoring, not conversational understanding.

**Exam Tip:** Intent = what the user wants; Entity = specific details within the message

</details>

---

### Question 2
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** medium

A travel company wants to build a customer service bot that can answer FAQs about booking policies, but should transfer complex complaints to human agents. The bot should understand natural language and maintain conversation context. Which Azure service should they primarily use?

- A) Azure Blob Storage for storing conversation logs
- B) Azure AI Bot Service with integration to Language Service for natural language understanding and escalation workflows
- C) Azure Virtual Machines running a custom chat application
- D) Azure SQL Database for querying customer responses

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Bot Service provides the bot framework for building conversational experiences, while Language Service (including question answering and conversational language understanding) enables natural language processing. Together, they support context maintenance and human handoff scenarios.

**Why not A:** Blob Storage is for file storage, not conversational AI functionality.

**Why not C:** Custom VMs would require building all conversational AI capabilities from scratch—inefficient compared to using purpose-built services.

**Why not D:** SQL Database is for data storage, not natural language conversation handling.

**Exam Tip:** Azure AI Bot Service + Language Service = complete conversational AI solution

</details>

---

### Question 3
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** easy

What is the primary characteristic that distinguishes generative AI from traditional AI systems?

- A) Generative AI can only classify existing data into predefined categories
- B) Generative AI creates new, original content based on learned patterns
- C) Generative AI requires no training data to function
- D) Generative AI can only process numerical data

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Generative AI is distinguished by its ability to create new, original content (text, images, code, etc.) based on patterns learned from training data, rather than just analyzing or classifying existing data.

**Why not A:** Classification is a characteristic of traditional discriminative AI models, not generative AI's distinguishing feature.

**Why not C:** Generative AI models require extensive training data—large language models are trained on massive text corpora.

**Why not D:** Generative AI can process and generate multiple data types including text, images, audio, and code.

**Exam Tip:** Understand the fundamental difference between generative and discriminative AI

</details>

---

### Question 4
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** easy

Which model family in Azure OpenAI Service is specifically designed for generating images from text descriptions?

- A) GPT-4
- B) DALL-E
- C) Whisper
- D) Ada

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

DALL-E is specifically designed for text-to-image generation, creating original images based on natural language descriptions provided in prompts.

**Why not A:** GPT-4 is a large language model designed for text generation, understanding, and reasoning—not image creation.

**Why not C:** Whisper is designed for speech-to-text transcription, not image generation.

**Why not D:** Ada is an embedding model used for text similarity and search applications, not image generation.

**Exam Tip:** Know which Azure OpenAI model family serves each modality: GPT for text, DALL-E for images, Whisper for speech

</details>

---

### Question 5
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** medium

An exam question asks about the Responsible AI principle that ensures AI systems provide equivalent service quality across different demographic groups. Which principle is being described?

- A) Transparency - understanding how decisions are made
- B) Fairness - avoiding bias and ensuring equitable treatment
- C) Privacy and Security - protecting user data
- D) Inclusiveness - making AI accessible to all users

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Fairness in Responsible AI specifically addresses ensuring AI systems don't discriminate and provide equitable outcomes across different demographic groups.

**Why not A:** Transparency is about explainability and understanding AI decisions, not demographic equity.

**Why not C:** Privacy and Security focus on data protection, not treatment across demographics.

**Why not D:** Inclusiveness is about accessibility and participation, which is related but distinct from fairness in outcomes.

**Exam Tip:** Know all six Responsible AI principles and their specific focus areas

</details>

---

### Question 6
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** hard

A financial services company is setting up Azure AI Foundry for their AI development team. They require that all AI models and data remain within specific geographic regions due to regulatory requirements. What should they configure?

- A) Configure data residency and select appropriate Azure regions for the AI Foundry hub that meet compliance requirements
- B) Disable all network connections to prevent any data transfer
- C) Use only consumer-grade AI tools that don't track location
- D) Request Microsoft to physically move their data centers

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: A**

This is the correct answer providing proper configuration for compliance.

**Why not B:** Disabling network connections would make the service unusable, not compliant.

**Why not C:** Consumer tools don't provide the enterprise compliance controls needed for financial services.

**Why not D:** Moving data centers isn't a customer option—Azure provides regional deployment choices instead.

**Exam Tip:** Azure AI Foundry supports regional deployment for data residency compliance

</details>

---

### Question 7
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** easy

In Azure AI Foundry, what is the relationship between a 'hub' and a 'project'?

- A) Hubs and projects are the same thing with different names
- B) A hub provides shared resources and governance, while projects are workspaces for specific AI applications within that hub
- C) Projects contain multiple hubs for organization
- D) Hubs are only used for billing, projects are only used for development

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

A hub is a top-level resource that provides shared infrastructure, connections, and governance policies. Projects exist within hubs and serve as collaborative workspaces for building specific AI applications.

**Why not A:** Hubs and projects serve different purposes in the organizational hierarchy.

**Why not C:** The relationship is reversed—hubs contain projects, not the other way around.

**Why not D:** Both hubs and projects serve development and management purposes, not just billing or development separately.

**Exam Tip:** Hub = shared infrastructure and governance; Project = specific application workspace

</details>

---

### Question 8
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** medium

A healthcare organization needs to deploy a large language model that keeps all patient data within their Azure subscription and meets HIPAA compliance requirements. Which Azure service should they use?

- A) Public OpenAI API accessed directly from openai.com
- B) Azure OpenAI Service with private endpoints
- C) Azure Cognitive Services Text Analytics only
- D) A free tier ChatGPT account with data export disabled

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure OpenAI Service provides enterprise-grade security, keeps data within your Azure subscription, supports private endpoints for network isolation, and is HIPAA-compliant—meeting healthcare regulatory requirements.

**Why not A:** The public OpenAI API doesn't provide the same enterprise security controls, compliance certifications, or data residency guarantees as Azure OpenAI Service.

**Why not C:** Text Analytics provides NLP capabilities but doesn't offer the generative AI capabilities of large language models.

**Why not D:** Consumer ChatGPT accounts don't meet enterprise compliance requirements and aren't designed for HIPAA-compliant workloads.

**Exam Tip:** Azure OpenAI Service provides enterprise security and compliance features not available in consumer OpenAI products

</details>

---

### Question 9
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

A retail company wants to implement a system that can automatically identify when store shelves are running low on products by analyzing security camera footage. Which type of AI workload best describes this application?

- A) Natural Language Processing
- B) Computer Vision
- C) Knowledge Mining
- D) Conversational AI

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Computer Vision is the AI workload that enables systems to interpret and analyze visual information from images and video, making it ideal for detecting shelf inventory levels from camera footage.

**Why not A:** A is incorrect because Natural Language Processing deals with understanding and generating human language, not analyzing visual content.

**Why not C:** C is incorrect because Knowledge Mining extracts insights from large volumes of documents and text, not from video analysis.

**Why not D:** D is incorrect because Conversational AI focuses on creating chatbots and voice assistants, not visual analysis.

**Exam Tip:** Match business scenarios to the appropriate AI workload category.

</details>

---

### Question 10
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** medium

A company is developing an AI-powered hiring tool. To ensure responsible development, which approach best demonstrates the principle of Inclusiveness?

- A) Testing the tool only with current employees who are similar to existing staff
- B) Ensuring the tool is accessible to job applicants with visual impairments using screen readers
- C) Making the tool available only during business hours
- D) Requiring all applicants to have a college degree to use the system

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Inclusiveness specifically addresses designing AI systems that work for people with disabilities. Ensuring screen reader compatibility makes the tool accessible to visually impaired applicants.

**Why not A:** A is incorrect because this would likely perpetuate existing biases and exclude diverse candidates.

**Why not C:** C is incorrect because time restrictions don't relate to Inclusiveness and may actually exclude some applicants.

**Why not D:** D is incorrect because arbitrary requirements exclude people and contradict Inclusiveness.

**Exam Tip:** Inclusiveness includes accessibility for people with disabilities.

</details>

---

### Question 11
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** medium

During the exam, you see this scenario: 'A retail company wants to automatically categorize customer reviews as positive, negative, or neutral.' You need to identify the AI workload type. What is the correct answer?

- A) Computer vision for image classification
- B) Natural language processing with sentiment analysis
- C) Speech recognition for voice reviews
- D) Anomaly detection for unusual review patterns

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Categorizing text reviews by sentiment (positive/negative/neutral) is a classic sentiment analysis task, which falls under natural language processing workloads.

**Why not A:** Computer vision processes images, but the scenario describes text reviews.

**Why not C:** Speech recognition converts audio to text; the reviews are already text-based.

**Why not D:** Anomaly detection finds outliers, not sentiment categories.

**Exam Tip:** Sentiment analysis classifies text into positive/negative/neutral categories

</details>

---

### Question 12
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** easy

On the AI-900 exam, you encounter a question asking which Azure service provides pre-built AI capabilities through REST APIs without requiring machine learning expertise. Which service category does this describe?

- A) Azure Machine Learning for training custom models
- B) Azure AI Services (Cognitive Services) providing ready-to-use AI APIs
- C) Azure Virtual Machines for hosting AI applications
- D) Azure Kubernetes Service for container orchestration

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Services (formerly Cognitive Services) provide pre-built AI capabilities like vision, speech, language, and decision-making through simple REST APIs, allowing developers to add AI without ML expertise.

**Why not A:** Azure Machine Learning is for building and training custom models, requiring ML expertise.

**Why not C:** Virtual Machines provide compute infrastructure but no built-in AI capabilities.

**Why not D:** AKS orchestrates containers but doesn't provide AI APIs directly.

**Exam Tip:** Azure AI Services = pre-built APIs; Azure Machine Learning = custom model development

</details>

---

### Question 13
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** medium

A warehouse management company wants to scan shipping labels and automatically extract tracking numbers, addresses, and package weights from images of packages. Which Azure service is best suited for this task?

- A) Azure AI Vision image tagging
- B) Custom Vision
- C) Azure AI Document Intelligence (Form Recognizer)
- D) Azure Video Indexer

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because Azure AI Document Intelligence (formerly Form Recognizer) is specifically designed to extract structured data like addresses, numbers, and text fields from documents and labels.

**Why not A:** A is incorrect because image tagging identifies general content categories, not specific text fields.

**Why not B:** B is incorrect because Custom Vision is for image classification and object detection, not text extraction.

**Why not D:** D is incorrect because Video Indexer analyzes video content, not document images.

**Exam Tip:** Document Intelligence = structured data extraction from forms and documents.

</details>

---

### Question 14
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** medium

Which Microsoft Responsible AI principle emphasizes that AI systems should be designed to assist and augment human capabilities rather than replace human judgment in critical decisions?

- A) Inclusiveness
- B) Reliability and Safety
- C) Accountability
- D) Fairness

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because Accountability ensures that people remain responsible for AI systems and their outcomes. This includes maintaining human oversight and control, especially for critical decisions.

**Why not A:** A is incorrect because Inclusiveness focuses on designing for people with disabilities and diverse needs.

**Why not B:** B is incorrect because Reliability and Safety focus on consistent, safe operation, not specifically on human oversight.

**Why not D:** D is incorrect because Fairness focuses on equitable treatment across groups, not human-AI collaboration.

**Exam Tip:** Accountability = humans remain responsible for AI decisions.

</details>

---

### Question 15
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** hard

A developer is using Azure OpenAI and notices that the model's responses are too creative and sometimes include factually incorrect information. Which parameter adjustment would make the outputs more deterministic and focused?

- A) Increase the temperature parameter to 1.5
- B) Decrease the temperature parameter closer to 0
- C) Increase the max_tokens parameter significantly
- D) Remove all system messages from the prompt

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Lowering the temperature parameter (closer to 0) makes the model more deterministic and conservative, reducing randomness in token selection and producing more focused, consistent outputs.

**Why not A:** Increasing temperature increases randomness and creativity, which would make the problem worse, not better.

**Why not C:** Max_tokens controls response length, not creativity or accuracy of the content.

**Why not D:** Removing system messages would reduce control over the model's behavior and wouldn't address the creativity/accuracy issue.

**Exam Tip:** Temperature controls randomness: lower = more deterministic, higher = more creative

</details>

---

### Question 16
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** medium

A data scientist is building a model to predict house prices based on features like square footage, number of bedrooms, and location. What type of machine learning task is this?

- A) Classification
- B) Regression
- C) Clustering
- D) Anomaly detection

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because regression is used to predict continuous numerical values. House prices are continuous numbers (e.g., $250,000, $350,500), making this a regression problem.

**Why not A:** A is incorrect because classification predicts discrete categories, not continuous values like prices.

**Why not C:** C is incorrect because clustering groups data without labels; this scenario has known prices for training.

**Why not D:** D is incorrect because anomaly detection identifies outliers, not predicting specific values.

**Exam Tip:** Predicting numbers = regression; predicting categories = classification.

</details>

---

### Question 17
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** hard

A legal firm is implementing Azure OpenAI to help attorneys draft contract clauses. They want the AI to reference their proprietary clause library when generating suggestions, but the library contains 50,000 clauses—far exceeding the model's context window. What is the recommended approach?

- A) Fine-tune the model on all 50,000 clauses so it memorizes them
- B) Implement Retrieval Augmented Generation (RAG) to fetch relevant clauses and include them in the prompt context
- C) Split the request into 50,000 separate API calls, one for each clause
- D) Compress all clauses into a single paragraph to fit the context window

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

RAG combines retrieval (finding relevant documents from a knowledge base) with generation (using the LLM to produce output). It searches the clause library for relevant clauses, includes them in the prompt context, enabling grounded responses without exceeding token limits.

**Why not A:** Fine-tuning teaches the model patterns and style, not specific facts—it wouldn't reliably recall all 50,000 clauses accurately and is expensive.

**Why not C:** Making 50,000 API calls is impractical, slow, and doesn't solve the problem of combining relevant information.

**Why not D:** Compressing would lose critical legal details and precision required for contract clauses.

**Exam Tip:** RAG is the solution for grounding LLM responses in large external knowledge bases

</details>

---

### Question 18
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** medium

An e-commerce company wants to group their customers into distinct segments based on purchasing behavior, but they don't have predefined categories. Which type of machine learning approach should they use?

- A) Supervised classification
- B) Supervised regression
- C) Unsupervised clustering
- D) Reinforcement learning

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because clustering is an unsupervised learning technique that groups similar data points together without predefined labels. It's ideal for discovering natural customer segments.

**Why not A:** A is incorrect because classification requires predefined categories (labels), which the company doesn't have.

**Why not B:** B is incorrect because regression predicts continuous numerical values, not groupings.

**Why not D:** D is incorrect because reinforcement learning is for learning through trial and error with rewards, not for customer segmentation.

**Exam Tip:** No predefined categories + grouping = unsupervised clustering.

</details>

---

### Question 19
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** hard

A company is building an AI agent that helps employees complete expense reports. The agent needs to: retrieve company expense policies, extract data from uploaded receipts, validate amounts against policy limits, and submit approved reports to the finance system. What architectural approach enables this?

- A) A single large language model call with all policies embedded in the prompt
- B) An agentic architecture using orchestration with multiple specialized tools: document retrieval, vision for receipts, reasoning for validation, and API integration for submission
- C) A static FAQ bot that provides policy links
- D) Direct database queries without any AI involvement

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

This complex workflow requires an agentic architecture that orchestrates multiple capabilities: RAG for policies, computer vision for receipt extraction, LLM reasoning for validation, and tool calling for system integration—each as specialized components.

**Why not A:** A single prompt can't handle document upload, receipt processing, and system integration—it's only text in/text out.

**Why not C:** A static FAQ bot can't extract receipt data, validate against policies, or submit to external systems.

**Why not D:** Database queries alone can't understand natural language, process images, or handle the reasoning required.

**Exam Tip:** Complex AI agents orchestrate multiple specialized tools and capabilities

</details>

---

### Question 20
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** easy

What distinguishes 'agentic AI' from traditional AI assistants?

- A) Agentic AI can only respond to single questions with no follow-up
- B) Agentic AI can autonomously plan, execute multi-step tasks, and take actions to achieve goals
- C) Agentic AI requires human approval for every single word it generates
- D) Agentic AI cannot use external tools or services

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Agentic AI systems can autonomously break down complex goals into subtasks, plan execution steps, use tools, and iterate on their approach—going beyond simple question-answering to actually accomplishing tasks.

**Why not A:** Agentic AI specifically handles complex, multi-step interactions rather than single exchanges.

**Why not C:** Agentic AI operates with autonomy, though responsible implementations include appropriate human oversight.

**Why not D:** Tool use is a key capability of agentic AI—agents often call APIs, databases, and external services.

**Exam Tip:** Agentic AI = autonomous goal achievement through planning, tool use, and multi-step execution

</details>

---

### Question 21
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** hard

A financial advisor firm is deploying a conversational AI assistant. They need to ensure the assistant never provides specific investment advice, always includes appropriate disclaimers, and escalates to human advisors for complex questions. How should they implement these safeguards?

- A) Hope the base model naturally avoids giving investment advice
- B) Implement system prompts with explicit behavioral boundaries, configure content filters, and design conversation flows with escalation triggers
- C) Block all financial-related keywords from user input
- D) Only deploy the bot internally with no client access

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

A multi-layered approach combines system prompts that define boundaries and required disclaimers, content filtering for additional safety, and conversation flow design that recognizes when to escalate to humans.

**Why not A:** Relying on default model behavior without explicit guardrails is irresponsible for regulated industries.

**Why not C:** Keyword blocking would prevent legitimate questions and is easily circumvented—it doesn't address the underlying need.

**Why not D:** Internal-only deployment doesn't solve the safeguard requirements and limits the business value.

**Exam Tip:** Responsible conversational AI requires multiple layers: prompts, filters, and escalation logic

</details>

---

### Question 22
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** easy

What is the difference between image classification and object detection in computer vision?

- A) Image classification is faster than object detection
- B) Image classification assigns a label to the entire image, while object detection locates and identifies multiple objects within an image
- C) Object detection only works with videos, not images
- D) Image classification can identify multiple objects, while object detection cannot

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because image classification labels what's in an image overall (e.g., 'beach scene'), while object detection identifies individual objects and their locations with bounding boxes (e.g., 'person at coordinates X,Y').

**Why not A:** A is incorrect because speed varies by implementation and isn't the defining difference.

**Why not C:** C is incorrect because object detection works on both images and video frames.

**Why not D:** D is incorrect because this is backwards; object detection identifies multiple objects, classification assigns one primary label.

**Exam Tip:** Object detection = WHAT objects and WHERE (bounding boxes).

</details>

---

### Question 23
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** hard

A wildlife conservation organization wants to build a system that can identify specific endangered species in camera trap images. The species are rare and not covered by pre-trained models. What is the recommended approach using Azure services?

- A) Use Azure AI Vision's pre-built image analysis API without any customization
- B) Train a Custom Vision model with labeled images of the target species
- C) Use Azure Speech Service to process animal sounds instead
- D) Manually review all images without AI assistance

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Custom Vision allows you to train models on your own labeled images to recognize specific objects or categories not covered by pre-built models, making it ideal for rare species identification.

**Why not A:** A is incorrect because pre-built models won't recognize rare or specialized species not in their training data.

**Why not C:** C is incorrect because the requirement is visual identification from camera images, not audio.

**Why not D:** D is incorrect because manual review doesn't scale and doesn't leverage AI capabilities.

**Exam Tip:** Custom Vision = train your own models for specific classification needs.

</details>

---

### Question 24
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** easy

A marketing company needs to analyze thousands of product images to automatically generate descriptive captions for their e-commerce website. Which Azure service should they use?

- A) Azure Form Recognizer
- B) Azure AI Vision
- C) Azure Language Service
- D) Azure Speech Service

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Azure AI Vision includes image captioning capabilities that can automatically generate human-readable descriptions of images, perfect for e-commerce product descriptions.

**Why not A:** A is incorrect because Form Recognizer is designed for extracting data from documents and forms, not generating image captions.

**Why not C:** C is incorrect because Language Service processes text, not images.

**Why not D:** D is incorrect because Speech Service handles audio, not visual content.

**Exam Tip:** Azure AI Vision = image analysis, captioning, and object detection.

</details>

---

### Question 25
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** easy

What is the primary characteristic that distinguishes Artificial Intelligence (AI) from traditional software programming?

- A) AI systems run faster than traditional programs
- B) AI systems can learn from data and improve over time without explicit programming for each task
- C) AI systems require more expensive hardware to operate
- D) AI systems are always connected to the internet

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because AI systems are fundamentally different from traditional software in their ability to learn patterns from data and improve their performance over time, rather than following only explicitly programmed rules.

**Why not A:** A is incorrect because processing speed is not what distinguishes AI from traditional software; both can be fast or slow depending on implementation.

**Why not C:** C is incorrect because hardware requirements vary widely and are not a defining characteristic of AI.

**Why not D:** D is incorrect because AI systems can operate offline; internet connectivity is not a defining feature of artificial intelligence.

**Exam Tip:** Understand the fundamental definition of AI as systems that can learn and adapt.

</details>

---

### Question 26
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** easy

According to Microsoft's Responsible AI principles, what does the principle of 'Transparency' require?

- A) AI systems must share all their source code publicly
- B) People should be able to understand how AI systems make decisions that affect them
- C) AI systems must operate without any human intervention
- D) AI systems must be free of charge for all users

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Transparency requires that AI systems be understandable - people should be able to comprehend how and why an AI system makes decisions, especially decisions that impact them.

**Why not A:** A is incorrect because transparency doesn't mean open-source; it means explainability and understandability.

**Why not C:** C is incorrect because this describes autonomous operation, which is actually counter to responsible AI oversight requirements.

**Why not D:** D is incorrect because transparency has nothing to do with pricing or accessibility costs.

**Exam Tip:** Transparency = explainability of AI decisions.

</details>

---

### Question 27
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** hard

You encounter this exam question: 'A manufacturing company wants to predict equipment failures before they occur using sensor data showing temperature, vibration, and pressure readings over time.' Which type of machine learning is most appropriate?

- A) Clustering to group similar equipment together
- B) Regression or classification using time-series analysis for predictive maintenance
- C) Image classification to identify equipment types
- D) Text analytics to process maintenance logs only

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Predictive maintenance using sensor data (temperature, vibration, pressure over time) is a supervised learning problem—either regression (predicting time to failure) or classification (predicting failure yes/no within timeframe) using time-series analysis.

**Why not A:** Clustering groups data but doesn't predict future failures from historical patterns.

**Why not C:** Image classification requires image data; the scenario describes sensor readings.

**Why not D:** Text analytics processes text; sensor data is numerical time-series data.

**Exam Tip:** Predictive maintenance with sensor data = supervised learning (regression/classification) on time-series

</details>

---

### Question 28
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** medium

An IT helpdesk wants to create a conversational bot that can answer common questions from an existing knowledge base of support articles. Users should be able to ask questions in natural language and receive relevant answers. Which Azure AI service feature is most appropriate?

- A) Azure AI Vision for analyzing support screenshots
- B) Custom question answering in Azure AI Language Service
- C) Azure Speech Service for text-to-speech conversion
- D) Azure AI Content Safety for moderating questions

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Custom question answering (part of Azure AI Language Service) enables building a knowledge base from existing documents and FAQs, then provides natural language question-answering capabilities over that content.

**Why not A:** AI Vision is for image analysis, not text-based knowledge base Q&A.

**Why not C:** Speech Service converts between speech and text but doesn't provide knowledge base question-answering.

**Why not D:** Content Safety is for moderation, not for answering questions from a knowledge base.

**Exam Tip:** Custom question answering creates Q&A bots from existing documentation

</details>

---

### Question 29
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** easy

Which statement best describes the relationship between Artificial Intelligence, Machine Learning, and Deep Learning?

- A) They are three separate and unrelated technologies
- B) Machine Learning is a subset of AI, and Deep Learning is a subset of Machine Learning
- C) Deep Learning is the broadest category that contains both AI and Machine Learning
- D) AI is a subset of Machine Learning, which is a subset of Deep Learning

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because AI is the broadest field encompassing all intelligent systems, Machine Learning is a specific approach within AI that uses data to learn, and Deep Learning is a specialized subset of ML using neural networks.

**Why not A:** A is incorrect because these technologies are hierarchically related, not separate.

**Why not C:** C is incorrect because the hierarchy is reversed; AI is the broadest category.

**Why not D:** D is incorrect because this reverses the correct hierarchy; AI contains ML, which contains Deep Learning.

**Exam Tip:** Know the nested relationship: AI > Machine Learning > Deep Learning.

</details>

---

### Question 30
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** easy

What is the primary purpose of Azure AI Foundry (formerly Azure AI Studio)?

- A) To provide free compute resources for any AI workload
- B) To serve as a unified platform for building, deploying, and managing AI applications
- C) To replace all other Azure services with a single AI service
- D) To provide only pre-built AI models with no customization options

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry is a unified development hub that brings together various AI capabilities, tools, and services to help developers build, test, deploy, and manage AI applications in one place.

**Why not A:** Azure AI Foundry doesn't provide free unlimited compute—resources are billed according to Azure pricing.

**Why not C:** Azure AI Foundry integrates with other Azure services rather than replacing them.

**Why not D:** Azure AI Foundry supports customization through fine-tuning, prompt engineering, and custom model deployment.

**Exam Tip:** Azure AI Foundry is the unified hub for the complete AI development lifecycle

</details>

---

### Question 31
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** easy

In machine learning, what is a 'label' in the context of training data?

- A) A name given to the machine learning algorithm
- B) The known outcome or answer associated with training examples
- C) A category of machine learning hardware
- D) The version number of the trained model

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because in supervised learning, a label is the known answer or outcome associated with each training example. For instance, in image classification, the label might be 'cat' or 'dog' for each image.

**Why not A:** A is incorrect because labels refer to training data annotations, not algorithm names.

**Why not C:** C is incorrect because labels are data attributes, not hardware categories.

**Why not D:** D is incorrect because labels are training data elements, not model versioning.

**Exam Tip:** Labels = known answers in supervised learning datasets.

</details>

---

### Question 32
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** hard

A credit card company is building a fraud detection model. Out of 1 million transactions, only 500 are fraudulent. When evaluating the model, which metric would be most misleading to use alone?

- A) Precision
- B) Recall
- C) Accuracy
- D) F1 Score

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because with highly imbalanced data (0.05% fraud), a model predicting 'not fraud' for everything would achieve 99.95% accuracy but catch zero fraud. Accuracy is misleading for imbalanced datasets.

**Why not A:** A is incorrect because precision (correct fraud predictions / total fraud predictions) is useful for understanding false positive rate.

**Why not B:** B is incorrect because recall (fraud caught / total fraud) directly measures how much fraud is detected.

**Why not D:** D is incorrect because F1 Score balances precision and recall, making it appropriate for imbalanced data.

**Exam Tip:** Accuracy is misleading with imbalanced classes; use precision, recall, or F1.

</details>

---

### Question 33
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

A hospital is implementing an AI system that can analyze medical images to detect early signs of cancer. The system was trained on thousands of labeled X-ray and MRI images. What type of AI approach does this represent?

- A) Rule-based expert system
- B) Supervised machine learning
- C) Unsupervised machine learning
- D) Robotic process automation

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because the system was trained on labeled data (images with known diagnoses), which is the defining characteristic of supervised learning where the model learns from examples with known outcomes.

**Why not A:** A is incorrect because rule-based systems use explicit programmed rules, not learning from labeled examples.

**Why not C:** C is incorrect because unsupervised learning works with unlabeled data to find patterns, whereas this scenario uses labeled images.

**Why not D:** D is incorrect because RPA automates repetitive tasks following predefined rules, not learning from medical images.

**Exam Tip:** Labeled training data indicates supervised learning.

</details>

---

### Question 34
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** easy

Which of Microsoft's Responsible AI principles ensures that AI systems work the same way for all groups of people regardless of race, gender, or other characteristics?

- A) Transparency
- B) Fairness
- C) Accountability
- D) Reliability

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because Fairness is the Responsible AI principle that specifically addresses ensuring AI systems do not discriminate and provide equitable treatment across different demographic groups.

**Why not A:** A is incorrect because Transparency is about making AI systems understandable, not about equal treatment.

**Why not C:** C is incorrect because Accountability is about people being responsible for AI systems, not about equal treatment.

**Why not D:** D is incorrect because Reliability is about systems working consistently and as intended, not specifically about demographic equality.

**Exam Tip:** Fairness = equal treatment across demographic groups.

</details>

---

### Question 35
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** hard

An AI researcher is explaining different types of AI to stakeholders. Which scenario describes an example of 'narrow AI' as opposed to 'general AI'?

- A) A system that can perform any intellectual task a human can do
- B) A chess-playing program that can also write poetry and drive cars
- C) A recommendation engine that suggests products based on purchase history
- D) A robot that can learn any new skill by watching humans once

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because narrow AI (also called weak AI) is designed to perform a specific task, like product recommendations. It excels at one thing but cannot generalize to other tasks.

**Why not A:** A is incorrect because this describes artificial general intelligence (AGI), which doesn't exist yet.

**Why not B:** B is incorrect because a system capable of multiple unrelated complex tasks would approach general AI capabilities.

**Why not D:** D is incorrect because one-shot learning of any skill would require general intelligence, not narrow AI.

**Exam Tip:** Current AI systems are narrow AI - specialized for specific tasks.

</details>

---

### Question 36
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** hard

A healthcare AI system that diagnoses skin conditions was found to be less accurate for patients with darker skin tones because the training data predominantly contained images of lighter skin. The development team needs to address this. Which actions align with Responsible AI principles? (Choose the best answer)

- A) Add a disclaimer that the system may be less accurate for some skin tones and continue deployment
- B) Retrain the model with a more diverse and representative dataset before redeployment
- C) Remove the skin tone variable from the model's inputs
- D) Deploy the system only in regions with predominantly lighter-skinned populations

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because addressing bias at its source (the training data) is the responsible approach. Retraining with diverse, representative data will improve fairness and accuracy across all populations.

**Why not A:** A is incorrect because disclaimers don't fix the underlying bias problem and still result in harm to underrepresented groups.

**Why not C:** C is incorrect because the issue isn't about using skin tone as an input variable but about the model's inability to accurately analyze diverse skin tones.

**Why not D:** D is incorrect because this perpetuates discrimination by denying equal access to healthcare AI.

**Exam Tip:** Training data diversity is crucial for model fairness.

</details>

---

### Question 37
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** medium

An organization needs to deploy a custom AI solution that combines Azure OpenAI for text generation with Azure AI Vision for image analysis, all managed through a single interface with unified monitoring. Which approach best achieves this?

- A) Deploy each service separately with no integration between them
- B) Use Azure AI Foundry to create a project that integrates multiple AI services with shared resources and monitoring
- C) Use only Azure Machine Learning for all tasks
- D) Create separate Azure subscriptions for each AI capability

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry allows you to create projects that integrate multiple Azure AI services, providing unified resource management, shared connections, and centralized monitoring across different AI capabilities.

**Why not A:** Deploying services separately without integration creates management overhead and lacks unified monitoring.

**Why not C:** Azure Machine Learning is excellent for custom ML but doesn't natively provide the Azure AI services integration that AI Foundry offers.

**Why not D:** Separate subscriptions would fragment management and increase complexity rather than providing unified control.

**Exam Tip:** Azure AI Foundry projects unify multiple AI services under single management

</details>

---

### Question 38
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** hard

A healthcare company has built an AI diagnostic assistant using Azure AI Foundry. Before production deployment, they need to evaluate the model's responses for accuracy, safety, and potential bias across different patient demographics. Which Azure AI Foundry capability should they use?

- A) Disable all safety filters to test raw model output
- B) Use the built-in evaluation tools to assess model performance with custom metrics for accuracy, groundedness, and fairness
- C) Deploy directly to production and gather user feedback manually
- D) Only test with a single sample input before deployment

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry provides built-in evaluation capabilities that can assess models against multiple metrics including accuracy, groundedness, coherence, and safety. Custom evaluation datasets can test performance across different demographics.

**Why not A:** Disabling safety filters for production AI is dangerous and irresponsible, especially in healthcare.

**Why not C:** Deploying untested AI in healthcare could harm patients—proper evaluation must occur before production.

**Why not D:** Single sample testing is statistically meaningless and wouldn't reveal demographic biases.

**Exam Tip:** Azure AI Foundry evaluation tools enable pre-deployment testing for safety and fairness

</details>

---

### Question 39
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** easy

What is the purpose of splitting data into training and validation sets when building a machine learning model?

- A) To make the model training process faster
- B) To evaluate how well the model performs on data it hasn't seen during training
- C) To reduce the storage space needed for the dataset
- D) To comply with data privacy regulations

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because the validation set provides unseen data to evaluate model performance objectively. This helps detect overfitting and ensures the model generalizes well to new data.

**Why not A:** A is incorrect because data splitting doesn't speed up training; it actually uses less data for training.

**Why not C:** C is incorrect because both sets still need to be stored; no storage is saved.

**Why not D:** D is incorrect because data splitting is a modeling best practice, not a privacy requirement.

**Exam Tip:** Validation data tests model generalization to unseen examples.

</details>

---

### Question 40
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

A company wants to add intelligent features to their mobile app that can understand user speech commands, recognize objects in photos, and provide personalized recommendations. They have limited AI expertise on their team. What approach should they consider first?

- A) Build custom AI models from scratch using raw computational resources
- B) Use pre-built AI services through cloud APIs like Azure Cognitive Services
- C) Hire a team of PhD researchers to develop proprietary algorithms
- D) Wait until artificial general intelligence is available

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because pre-built AI services (like Azure Cognitive Services) allow developers with limited AI expertise to add intelligent features using simple API calls, without building models from scratch.

**Why not A:** A is incorrect because building from scratch requires extensive AI expertise and is unnecessary when pre-built services exist.

**Why not C:** C is incorrect because this is expensive and time-consuming when ready-made solutions are available.

**Why not D:** D is incorrect because current narrow AI services can accomplish these specific tasks effectively.

**Exam Tip:** Azure Cognitive Services provides pre-built AI capabilities accessible via APIs.

</details>

---

### Question 41
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** medium

A marketing agency wants to use Azure OpenAI Service to generate product descriptions for an e-commerce client. They need the AI to maintain a consistent brand voice and include specific product specifications. Which approach should they implement?

- A) Train a completely new GPT model from scratch using only product data
- B) Use prompt engineering with system messages to define the brand voice and include product details in user prompts
- C) Use the image generation capabilities of DALL-E for text descriptions
- D) Deploy the model without any customization since GPT models automatically detect brand requirements

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Prompt engineering with system messages allows you to define consistent behavior, tone, and style guidelines, while user prompts can include specific product details. This is the most efficient approach for maintaining brand voice.

**Why not A:** Training a new model from scratch is impractical, extremely expensive, and unnecessary for this use case—prompt engineering achieves the goal.

**Why not C:** DALL-E is designed for image generation, not text generation. GPT models handle text generation.

**Why not D:** GPT models don't automatically detect brand requirements—explicit instructions through prompts are necessary for consistent output.

**Exam Tip:** Know when to use prompt engineering versus fine-tuning for customization

</details>

---

### Question 42
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** hard

A manufacturing company has sensor data from production equipment and historical records showing when machines failed. They want to predict equipment failures before they occur. Which features are most important for training this predictive maintenance model?

- A) Only the current sensor readings at the moment of prediction
- B) Sensor readings over time, maintenance history, and operational patterns leading up to past failures
- C) Only the brand and model number of the equipment
- D) The names of employees who operate the machines

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

B is correct because predictive maintenance requires temporal patterns (trends over time), historical context (maintenance records), and operational data that preceded past failures to identify warning signs.

**Why not A:** A is incorrect because point-in-time readings miss the temporal patterns that indicate impending failure.

**Why not C:** C is incorrect because static equipment info alone cannot predict when a specific machine will fail.

**Why not D:** D is incorrect because operator names are not predictive features for mechanical failures.

**Exam Tip:** Feature engineering should include temporal patterns for time-series predictions.

</details>

---

### Question 43
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** medium

A bank uses an AI model to approve or deny loan applications. After deployment, they discover the model denies loans to applicants from certain zip codes at a higher rate, even when all other factors are equal. Which Responsible AI principle has been violated?

- A) Privacy and Security
- B) Inclusiveness
- C) Fairness
- D) Transparency

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because the model is exhibiting bias by treating applicants differently based on their geographic location, which often correlates with demographic factors. This violates the Fairness principle.

**Why not A:** A is incorrect because the issue isn't about data protection but about discriminatory outcomes.

**Why not B:** B is incorrect because Inclusiveness is about designing for people with disabilities and diverse needs, not specifically about biased decisions.

**Why not D:** D is incorrect because the issue isn't about understanding the model but about its discriminatory behavior.

**Exam Tip:** Proxy discrimination (using location as proxy for demographics) violates Fairness.

</details>

---

### Question 44
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** medium

A security company needs to verify that employees entering a building match their ID badge photos. They need real-time comparison of a live camera feed against stored employee photos. Which Azure AI Vision capability should they implement?

- A) Image classification
- B) Optical Character Recognition (OCR)
- C) Face verification
- D) Object detection

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: C**

C is correct because Face verification is specifically designed to compare two faces and determine if they belong to the same person, which is exactly what's needed to match live images against badge photos.

**Why not A:** A is incorrect because classification categorizes images into predefined classes, not compare faces.

**Why not B:** B is incorrect because OCR extracts text from images, not compares faces.

**Why not D:** D is incorrect because object detection locates objects in images but doesn't compare facial identity.

**Exam Tip:** Face verification = 1:1 comparison (is this the same person?).

</details>

---

### Question 45
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** medium

A data science team wants to experiment with different foundation models, test prompt variations, and evaluate model performance before deploying to production. They need a collaborative environment where team members can share their work. Which Azure AI Foundry feature addresses this need?

- A) Azure Blob Storage containers for file sharing
- B) The playground and project workspace features in Azure AI Foundry
- C) Azure DevOps pipelines exclusively
- D) Individual Azure subscriptions for each team member

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry's playground allows interactive model experimentation and prompt testing, while project workspaces provide collaborative environments where teams can share prompts, evaluations, and deployments.

**Why not A:** Blob Storage is for file storage, not interactive AI experimentation and collaboration on model testing.

**Why not C:** Azure DevOps is for CI/CD pipelines, not interactive model experimentation and prompt engineering.

**Why not D:** Separate subscriptions would prevent collaboration rather than enable it.

**Exam Tip:** Azure AI Foundry playground enables rapid experimentation; projects enable team collaboration

</details>

---

## Answer Key

| Q | Answer | Domain | Difficulty |
|---|--------|--------|-----------|
| 1 | B | Building Smart Assistants: Agentic AI and Conversational AI | easy |
| 2 | B | Building Smart Assistants: Agentic AI and Conversational AI | medium |
| 3 | B | The AI Revolution: Generative AI and Azure OpenAI | easy |
| 4 | B | The AI Revolution: Generative AI and Azure OpenAI | easy |
| 5 | B | Exam Day Success: AI-901 Review and Test Strategies | medium |
| 6 | A | Meet Microsoft Foundry: Your AI Development Hub | hard |
| 7 | B | Meet Microsoft Foundry: Your AI Development Hub | easy |
| 8 | B | The AI Revolution: Generative AI and Azure OpenAI | medium |
| 9 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 10 | B | Building AI with a Conscience: Responsible AI Principles | medium |
| 11 | B | Exam Day Success: AI-901 Review and Test Strategies | medium |
| 12 | B | Exam Day Success: AI-901 Review and Test Strategies | easy |
| 13 | C | Giving Machines Eyes: Computer Vision on Azure | medium |
| 14 | C | Building AI with a Conscience: Responsible AI Principles | medium |
| 15 | B | The AI Revolution: Generative AI and Azure OpenAI | hard |
| 16 | B | Teaching Machines to Learn: ML Fundamentals | medium |
| 17 | B | The AI Revolution: Generative AI and Azure OpenAI | hard |
| 18 | C | Teaching Machines to Learn: ML Fundamentals | medium |
| 19 | B | Building Smart Assistants: Agentic AI and Conversational AI | hard |
| 20 | B | Building Smart Assistants: Agentic AI and Conversational AI | easy |
| 21 | B | Building Smart Assistants: Agentic AI and Conversational AI | hard |
| 22 | B | Giving Machines Eyes: Computer Vision on Azure | easy |
| 23 | B | Giving Machines Eyes: Computer Vision on Azure | hard |
| 24 | B | Giving Machines Eyes: Computer Vision on Azure | easy |
| 25 | B | Welcome to the World of AI: What Makes Machines Smart? | easy |
| 26 | B | Building AI with a Conscience: Responsible AI Principles | easy |
| 27 | B | Exam Day Success: AI-901 Review and Test Strategies | hard |
| 28 | B | Building Smart Assistants: Agentic AI and Conversational AI | medium |
| 29 | B | Welcome to the World of AI: What Makes Machines Smart? | easy |
| 30 | B | Meet Microsoft Foundry: Your AI Development Hub | easy |
| 31 | B | Teaching Machines to Learn: ML Fundamentals | easy |
| 32 | C | Teaching Machines to Learn: ML Fundamentals | hard |
| 33 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 34 | B | Building AI with a Conscience: Responsible AI Principles | easy |
| 35 | C | Welcome to the World of AI: What Makes Machines Smart? | hard |
| 36 | B | Building AI with a Conscience: Responsible AI Principles | hard |
| 37 | B | Meet Microsoft Foundry: Your AI Development Hub | medium |
| 38 | B | Meet Microsoft Foundry: Your AI Development Hub | hard |
| 39 | B | Teaching Machines to Learn: ML Fundamentals | easy |
| 40 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 41 | B | The AI Revolution: Generative AI and Azure OpenAI | medium |
| 42 | B | Teaching Machines to Learn: ML Fundamentals | hard |
| 43 | C | Building AI with a Conscience: Responsible AI Principles | medium |
| 44 | C | Giving Machines Eyes: Computer Vision on Azure | medium |
| 45 | B | Meet Microsoft Foundry: Your AI Development Hub | medium |

---

## Domain Score Tracker

| Domain | Questions | Your Score |
|--------|-----------|------------|
| Welcome to the World of AI: What Makes Machines Smart? | 6 | /11 |
| Building AI with a Conscience: Responsible AI Principles | 6 | /11 |
| Teaching Machines to Learn: ML Fundamentals | 6 | /11 |
| Giving Machines Eyes: Computer Vision on Azure | 6 | /11 |
| Teaching Machines to Understand Language: NLP Workloads | 6 | /11 |
| The AI Revolution: Generative AI and Azure OpenAI | 6 | /11 |
| Meet Microsoft Foundry: Your AI Development Hub | 6 | /11 |
| Building Smart Assistants: Agentic AI and Conversational AI | 6 | /11 |
| Exam Day Success: AI-901 Review and Test Strategies | 7 | /11 |

*Fill in as you check your answers*
