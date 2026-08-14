# AI-901 Azure AI Fundamentals: Your Gateway to Microsoft AI — Practice Test 2

> **Time Limit:** 90 minutes
> **Questions:** 42
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
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** medium

Your organization is implementing Azure AI services and needs to ensure responsible AI practices. Which action supports the Accountability principle?

- A) Encrypting all data used by AI models
- B) Establishing a governance framework with defined roles, oversight processes, and audit trails for AI decisions
- C) Using only pre-trained models from Microsoft
- D) Limiting AI usage to non-critical business functions

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Accountability requires clear governance structures including defined responsibilities, oversight mechanisms, and audit capabilities so that humans maintain control and can trace AI decisions.

**Why not A:** Encryption supports privacy and security principles, not accountability for AI decisions.

**Why not C:** Using pre-trained models doesn't address who is responsible for AI outcomes or how decisions are tracked.

**Why not D:** Limiting AI to non-critical functions doesn't establish accountability—it just avoids the question rather than addressing governance.

**Exam Tip:** Accountability = governance + oversight + audit trails. People must be responsible for AI system behavior.

</details>

---

### Question 2
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** hard

An AI-901 question presents four options where two seem equally correct for the scenario described. What is the BEST approach to identify the most appropriate answer?

- A) Choose the first plausible answer and move on quickly
- B) Look for qualifying words in the question and eliminate options that don't address ALL requirements
- C) Select the answer that represents the most complex solution
- D) Skip the question and return to it only if time permits

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Qualifying words like 'MOST,' 'PRIMARY,' 'MINIMUM,' or specific requirements in the scenario help distinguish between good answers and the BEST answer. Re-reading for these details often reveals why one option is superior.

**Why not A:** Rushing through close-call questions often leads to missing key distinctions that indicate the best answer.

**Why not C:** The best answer is the most APPROPRIATE, not necessarily the most complex—simpler solutions are often preferred.

**Why not D:** While flagging for review is valid, the systematic approach of analyzing qualifiers should be tried first.

**Exam Tip:** When stuck between two answers, re-read the question for qualifiers like MOST, PRIMARY, MINIMUM, or BEST.

</details>

---

### Question 3
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** medium

A warehouse wants to implement a system that can identify when workers are not wearing required safety equipment (hard hats, safety vests) in specific zones. The system should alert supervisors in real-time. Which Azure AI Vision capability is most appropriate?

- A) Image classification to categorize images as 'safe' or 'unsafe'
- B) Custom object detection trained to detect people and specific safety equipment with spatial analysis
- C) Optical Character Recognition to read safety badge information
- D) Face detection to identify which workers are present

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Object detection locates and identifies multiple objects (people, hard hats, vests) within images, enabling logic to determine if detected people have the required safety equipment near them in the frame.

**Why not A:** Image classification labels entire images but can't identify WHERE objects are or determine which specific equipment is missing from which worker.

**Why not C:** OCR reads text and wouldn't help detect physical safety equipment presence.

**Why not D:** Face detection identifies faces but not safety equipment—you'd still need object detection for the equipment.

**Exam Tip:** When you need to locate specific items within an image (not just categorize the whole image), object detection is the answer.

</details>

---

### Question 4
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** medium

A model performs extremely well on training data but poorly on new, unseen data. What is this phenomenon called, and what might cause it?

- A) Underfitting—the model is too simple to capture patterns
- B) Overfitting—the model memorized training data specifics rather than learning generalizable patterns
- C) Data leakage—test data was accidentally included in training
- D) Feature drift—the input features changed between training and testing

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Overfitting occurs when a model learns training data too specifically, including noise and peculiarities, rather than generalizable patterns. This results in excellent training performance but poor generalization to new data.

**Why not A:** Underfitting shows poor performance on BOTH training and test data because the model is too simple—not the pattern described.

**Why not C:** Data leakage would artificially inflate both training and test metrics, not create the training/test performance gap described.

**Why not D:** Feature drift describes changes in data distribution over time in production, not the training/test performance gap during development.

**Exam Tip:** High training accuracy + low test accuracy = Overfitting. Low both = Underfitting.

</details>

---

### Question 5
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** hard

A machine learning model for fraud detection achieves 99.5% accuracy on the test set. However, when deployed to production, it catches only 40% of actual fraud cases. Further analysis reveals fraud represents only 0.5% of all transactions in the dataset. What is the primary issue?

- A) The model is overfitting to the training data
- B) Accuracy is misleading for imbalanced datasets; the model likely predicts 'not fraud' for everything and should use precision, recall, or F1-score
- C) The test set was too small
- D) The model needs more training epochs

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

With 0.5% fraud rate, a model predicting 'not fraud' for everything achieves 99.5% accuracy but catches 0% of fraud. Accuracy is misleading for imbalanced datasets—metrics like recall (catching fraud) and precision (avoiding false alarms) matter more.

**Why not A:** Overfitting would show high training accuracy but poor test accuracy—this model shows high test accuracy but poor real-world fraud detection (different problem).

**Why not C:** Test set size isn't the issue—the fundamental problem is using an inappropriate metric for imbalanced data.

**Why not D:** More training wouldn't fix using the wrong evaluation metric—the model needs to be optimized for the right metric (recall for fraud detection).

**Exam Tip:** For imbalanced datasets (fraud, rare diseases), accuracy can be deceiving—look for recall, precision, F1-score, or confusion matrix analysis.

</details>

---

### Question 6
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** hard

A developer is testing GPT-4 for creative story generation and notices the outputs are too predictable and repetitive. Which parameter adjustment would MOST effectively increase creativity and variety in the generated stories?

- A) Decrease the temperature from 0.7 to 0.2
- B) Increase the temperature from 0.7 to 0.9
- C) Increase the max_tokens from 500 to 2000
- D) Decrease the frequency_penalty from 0.5 to 0

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Increasing temperature makes the model more creative by allowing it to select less probable tokens, resulting in more varied and unpredictable outputs ideal for creative writing.

**Why not A:** Decreasing temperature makes outputs MORE deterministic and predictable, which is the opposite of what's needed.

**Why not C:** Max_tokens controls output length, not creativity or variety of the content generated.

**Why not D:** Decreasing frequency_penalty would actually encourage MORE repetition, not less, worsening the problem.

**Exam Tip:** Temperature controls randomness: higher = more creative, lower = more deterministic.

</details>

---

### Question 7
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** easy

When encountering a question about choosing between Azure services, what strategy is MOST effective for identifying the correct answer?

- A) Always select the service with the most features
- B) Match the specific requirements in the scenario to each service's primary purpose
- C) Choose the newest Azure service mentioned in the options
- D) Select the most expensive service as it will have the best capabilities

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Exam questions test whether you understand which service is designed for which purpose. Matching scenario requirements to each service's primary use case is the systematic approach to finding the best answer.

**Why not A:** More features doesn't mean better fit—the right answer is the service designed for the specific scenario's needs.

**Why not C:** Service age is irrelevant; the correct choice depends on matching capabilities to requirements.

**Why not D:** Cost is rarely the determining factor in AI-901, and expensive doesn't equal appropriate for the use case.

**Exam Tip:** Read the scenario requirements carefully—the answer matches the PRIMARY purpose of a service.

</details>

---

### Question 8
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** easy

According to Microsoft's responsible AI principles, what does 'Inclusiveness' require when developing AI systems?

- A) Making AI available only to enterprise customers who can afford it
- B) Designing AI to engage and empower everyone, including people with disabilities
- C) Including all possible features in every AI product
- D) Allowing all employees access to modify AI models

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Inclusiveness means AI should be designed to engage and benefit all people, considering diverse needs including accessibility for people with disabilities and users from different backgrounds.

**Why not A:** Limiting availability contradicts inclusiveness—the principle aims to benefit everyone, not exclude based on ability to pay.

**Why not C:** Feature completeness isn't related to inclusiveness—the principle is about equitable access and benefit, not feature quantity.

**Why not D:** Access to modify AI models relates to governance and security, not the inclusiveness principle.

**Exam Tip:** Inclusiveness focuses on ensuring AI benefits diverse users—consider accessibility, language, cultural factors, and varied abilities.

</details>

---

### Question 9
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** medium

A law firm wants to build an AI assistant that can help lawyers draft legal documents based on case precedents stored in their internal database. The AI should generate new content while referencing specific legal documents. Which Azure OpenAI capability is MOST essential for this requirement?

- A) Fine-tuning a model on legal terminology
- B) Using embeddings with Retrieval Augmented Generation (RAG)
- C) Deploying a custom DALL-E model for document visualization
- D) Implementing real-time speech-to-text transcription

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

RAG combines the generative capabilities of language models with the ability to retrieve and reference specific documents from a knowledge base, making it ideal for generating legal documents while citing specific case precedents.

**Why not A:** Fine-tuning changes model behavior but doesn't enable dynamic retrieval of specific documents from an internal database.

**Why not C:** DALL-E generates images, not text documents, and is unrelated to legal document drafting.

**Why not D:** Speech-to-text is for converting audio to text and doesn't address document generation or retrieval needs.

**Exam Tip:** RAG is the solution when AI needs to generate content while referencing specific organizational documents.

</details>

---

### Question 10
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** easy

In the context of building conversational AI, what does 'intent recognition' accomplish?

- A) Translating user input from one language to another
- B) Determining what action or goal the user is trying to accomplish
- C) Converting spoken words into written text
- D) Generating natural language responses to user queries

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Intent recognition analyzes user input to determine their purpose or goal—for example, recognizing that 'I want to book a flight' and 'Can you help me fly to Paris?' both represent a 'BookFlight' intent.

**Why not A:** Translation is handled by Azure Translator service, not intent recognition.

**Why not C:** Speech-to-text conversion is handled by Azure Speech Services, not intent recognition.

**Why not D:** Response generation is a separate step that occurs after understanding the user's intent.

**Exam Tip:** Intent = what the user wants to DO. Entity = the specific details (like dates, names, locations).

</details>

---

### Question 11
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** medium

What distinguishes a foundation model from a traditional machine learning model in the context of generative AI?

- A) Foundation models can only be used for image generation tasks
- B) Foundation models are pre-trained on vast datasets and can be adapted to many downstream tasks
- C) Foundation models require less computational resources than traditional ML models
- D) Foundation models are always open-source and freely available

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Foundation models like GPT-4 are trained on massive, diverse datasets, giving them broad capabilities that can be adapted to numerous downstream tasks through prompting or fine-tuning without starting from scratch.

**Why not A:** Foundation models support multiple modalities including text, code, images, and audio—not just image generation.

**Why not C:** Foundation models actually require significantly MORE computational resources for training than traditional ML models.

**Why not D:** Many foundation models are proprietary (like GPT-4), and availability varies significantly across models.

**Exam Tip:** Foundation models are characterized by massive pre-training that enables broad adaptability.

</details>

---

### Question 12
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** medium

When building a customer service chatbot, a developer wants to ensure the bot gracefully handles situations where it cannot understand the user's request. Which conversational AI design practice addresses this?

- A) Implementing a fallback intent with helpful guidance
- B) Increasing the confidence threshold to 100%
- C) Removing all intents that have low training data
- D) Disabling the bot when confidence is below threshold

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: A**

This is the correct answer as explained above.

**Why not B:** Requiring 100% confidence would cause almost all inputs to fail, as NLU rarely achieves perfect confidence.

**Why not C:** Removing intents reduces bot capability and doesn't address how to handle misunderstood requests.

**Why not D:** Disabling the bot provides a terrible user experience and doesn't help users accomplish their goals.

**Exam Tip:** Always design for failure—fallback intents are essential for graceful degradation in conversational AI.

</details>

---

### Question 13
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** hard

An autonomous vehicle AI system is being deployed. During testing, engineers discover the system occasionally makes unpredictable decisions in rare weather conditions not well-represented in training data. The company wants to proceed with deployment because overall safety metrics exceed human drivers. Which responsible AI principle is most relevant to this decision?

- A) Fairness—the system should perform equally in all weather conditions
- B) Reliability and Safety—the system must perform consistently and prevent harm even in edge cases
- C) Transparency—users should be informed about weather limitations
- D) Privacy—weather data collection must be properly consented

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Reliability and Safety is most critical here because unpredictable behavior in safety-critical systems can cause harm. Even with good overall metrics, edge case failures in autonomous vehicles can be life-threatening.

**Why not A:** Fairness typically concerns equitable treatment across people/groups, not equal performance in different environmental conditions.

**Why not C:** While informing users is important, the primary concern is ensuring safe, predictable behavior—transparency alone doesn't solve the safety risk.

**Why not D:** Weather data privacy isn't the central concern when discussing unpredictable AI behavior in safety-critical situations.

**Exam Tip:** Safety-critical AI systems must be reliable and predictable—edge cases matter enormously when lives are at stake.

</details>

---

### Question 14
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** medium

What is the purpose of splitting data into training, validation, and test sets in machine learning?

- A) To reduce storage costs by keeping less data
- B) Training builds the model, validation tunes hyperparameters, and test provides final unbiased performance evaluation
- C) To ensure each set contains different features
- D) To allow three different models to be trained simultaneously

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Training data teaches the model patterns, validation data helps tune hyperparameters and select the best model version, and test data provides a final unbiased evaluation of how the model will perform on unseen data.

**Why not A:** Splitting doesn't reduce data—it divides existing data for different purposes in the ML workflow.

**Why not C:** All sets should contain the same features; the split separates examples (rows), not features (columns).

**Why not D:** The splits are used sequentially for one model's development, not to train multiple separate models.

**Exam Tip:** Remember: Train→learn patterns, Validate→tune model, Test→final unbiased evaluation. Never train on test data!

</details>

---

### Question 15
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** medium

A developer wants to build an AI application that first analyzes a customer email, then retrieves relevant product information, and finally generates a personalized response. Which Azure AI Foundry feature is designed specifically for this type of multi-step workflow?

- A) Model deployment endpoints
- B) Prompt flow
- C) Azure AI Search integration
- D) Content safety filters

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Prompt flow is designed to create, test, and deploy multi-step AI workflows that chain together LLM calls, data retrieval, and processing logic—exactly what's needed for this email analysis and response generation pipeline.

**Why not A:** Model endpoints provide access to deployed models but don't orchestrate multi-step workflows.

**Why not C:** AI Search provides retrieval capabilities but doesn't orchestrate the complete workflow including analysis and generation.

**Why not D:** Content safety filters moderate outputs but don't create or manage multi-step application logic.

**Exam Tip:** Prompt flow is for orchestrating LLM pipelines—think multi-step AI workflows.

</details>

---

### Question 16
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** hard

A bank implements a system that automatically processes loan applications. The system extracts information from documents, verifies applicant identity through facial recognition, analyzes credit risk using historical data patterns, and generates personalized loan offer letters. Which statement correctly identifies the AI workloads involved?

- A) This uses only Machine Learning since all tasks involve data analysis
- B) This combines Computer Vision for document extraction and identity verification, Machine Learning for credit risk analysis, and Natural Language Generation for offer letters
- C) This is primarily a Computer Vision workload with some automation features
- D) This requires only Generative AI since it creates personalized output

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

The scenario correctly combines multiple AI workloads: Computer Vision for OCR and facial recognition, Machine Learning for pattern-based credit risk analysis, and Natural Language Generation (part of NLP) for creating personalized letters.

**Why not A:** While ML is involved, document extraction uses OCR (Computer Vision) and letter generation uses NLP—these are distinct workloads.

**Why not C:** Computer Vision handles only the visual tasks (documents, faces); it cannot analyze credit risk or generate personalized text.

**Why not D:** Generative AI could create letters, but credit risk analysis requires predictive ML, and document/identity processing requires Computer Vision.

**Exam Tip:** Complex scenarios often combine multiple AI workloads—identify each specific task and match it to the appropriate AI capability.

</details>

---

### Question 17
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** easy

A marketing team wants to generate unique product images from text descriptions for their e-commerce catalog. Which Azure OpenAI model family should they use?

- A) GPT-4
- B) DALL-E
- C) Whisper
- D) Text Embedding Ada

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

DALL-E is specifically designed for text-to-image generation, allowing users to create original images from natural language descriptions.

**Why not A:** GPT-4 is a language model for text generation and cannot create images from text descriptions.

**Why not C:** Whisper is a speech recognition model for audio-to-text transcription, not image generation.

**Why not D:** Text Embedding Ada creates vector representations of text for similarity searches, not images.

**Exam Tip:** Know which model family handles which modality: DALL-E for images, GPT for text, Whisper for speech.

</details>

---

### Question 18
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** hard

A data scientist is building a regression model to predict house prices. The model shows good performance, but investigation reveals that one input feature is the 'final_sale_price' from a preliminary database that sometimes contains the actual target value. What problem does this represent?

- A) Feature multicollinearity causing unstable coefficients
- B) Data leakage where information about the target has leaked into features
- C) Missing value imputation problems
- D) Incorrect feature scaling affecting model convergence

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

This is data leakage—the input feature directly contains or strongly correlates with the target variable in ways that wouldn't be available at prediction time, giving unrealistically good results that won't generalize.

**Why not A:** Multicollinearity involves correlation between features, not a feature containing the target value itself.

**Why not C:** Missing value issues would affect data quality, but the described problem is about inappropriate feature inclusion.

**Why not D:** Feature scaling affects training convergence, not the fundamental validity of using certain features.

**Exam Tip:** Data leakage is a critical concept—always ask 'would this feature be available at prediction time?' If it's derived from the target, it's leakage.

</details>

---

### Question 19
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** hard

A healthcare organization wants to use Azure OpenAI but is concerned about patient data appearing in model training. Their compliance team requires assurance that their prompts and data won't be used to improve Microsoft's models. Which Azure OpenAI characteristic addresses this concern?

- A) Azure OpenAI automatically anonymizes all patient data before processing
- B) Customer data submitted to Azure OpenAI is not used to train or improve Microsoft models
- C) Azure OpenAI models are HIPAA-certified and don't require data protection measures
- D) Customer prompts are only retained for 30 days before automatic deletion

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Microsoft explicitly states that customer prompts and completions submitted to Azure OpenAI are NOT used to train, retrain, or improve Microsoft's foundation models, providing the data isolation healthcare organizations require.

**Why not A:** Azure OpenAI doesn't automatically anonymize data—organizations must handle PHI appropriately before submission.

**Why not C:** While Azure is HIPAA-compliant with a BAA, organizations still need to implement appropriate data protection measures.

**Why not D:** Data retention policies vary and this doesn't address the specific concern about model training.

**Exam Tip:** Azure OpenAI provides data isolation—your data is NOT used to train Microsoft's models.

</details>

---

### Question 20
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** easy

What is the primary distinction between Artificial Intelligence (AI) and traditional software programming?

- A) AI requires more expensive hardware than traditional software
- B) AI systems can learn patterns from data rather than following only explicit programmed rules
- C) AI applications can only run in cloud environments
- D) AI software is always more accurate than traditional software

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

The fundamental distinction of AI is its ability to learn patterns from data and make predictions or decisions, rather than relying solely on explicitly coded rules.

**Why not A:** While some AI workloads require significant compute power, hardware cost is not what defines AI versus traditional software.

**Why not C:** AI can run on-premises, at the edge, or in the cloud—deployment location doesn't define what makes it AI.

**Why not D:** AI is not inherently more accurate; its effectiveness depends on data quality, model design, and the specific use case.

**Exam Tip:** Focus on the 'learning from data' concept as the core differentiator of AI systems.

</details>

---

### Question 21
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** easy

What is the relationship between Azure AI Foundry portal and Azure AI Foundry SDK?

- A) The portal is for business users while the SDK is exclusively for data scientists
- B) The portal provides a visual interface while the SDK enables programmatic access to the same capabilities
- C) The SDK has more features than the portal and should always be preferred
- D) The portal and SDK access different backend services and cannot be used together

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry portal offers a graphical user interface for AI development, while the SDK provides programmatic access through code. Both interact with the same underlying services and can be used complementarily.

**Why not A:** Both tools can be used by various roles; the distinction is visual vs. programmatic interaction, not user type.

**Why not C:** Both offer access to the same core capabilities; the choice depends on workflow preference, not feature superiority.

**Why not D:** The portal and SDK access the same backend services and are designed to work together in development workflows.

**Exam Tip:** Portal vs SDK is about interaction style (visual vs code), not different capabilities.

</details>

---

### Question 22
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** hard

A financial services company is building a customer service chatbot using Azure AI Foundry. They need to test how the AI responds to various customer scenarios before deployment and ensure responses meet quality standards. Which AI Foundry capability should they prioritize?

- A) Model catalog for browsing available foundation models
- B) Evaluation tools for assessing model responses against test datasets
- C) Prompt flow for orchestrating multi-step AI workflows
- D) Data connections for linking to external databases

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

AI Foundry's evaluation tools allow teams to systematically test model responses against curated test datasets, measure quality metrics, and ensure the chatbot meets predefined standards before production deployment.

**Why not A:** The model catalog helps select models but doesn't directly test response quality against specific scenarios.

**Why not C:** Prompt flow is for building workflows, not specifically for systematic quality evaluation of responses.

**Why not D:** Data connections enable data access but don't address the testing and quality assurance requirements.

**Exam Tip:** Evaluation tools in AI Foundry are essential for quality assurance before deployment.

</details>

---

### Question 23
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** hard

An e-commerce company wants to build an AI assistant that can not only answer product questions but also check real-time inventory, process returns, and update customer preferences in their CRM system. The assistant should decide which actions to take based on the conversation. Which AI architecture pattern best describes this requirement?

- A) A retrieval-augmented generation (RAG) chatbot
- B) An agentic AI system with tool-use capabilities
- C) A rule-based dialog flow system
- D) A simple question-answering bot with FAQ integration

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Agentic AI systems can autonomously reason about user needs, decide which tools or APIs to invoke (inventory, CRM, returns), and take actions—going beyond simple Q&A to execute multi-step tasks with external system integration.

**Why not A:** RAG enhances responses with retrieved documents but doesn't provide autonomous action-taking or tool-use capabilities.

**Why not C:** Rule-based systems follow predetermined paths and lack the autonomous reasoning needed for dynamic action selection.

**Why not D:** FAQ bots answer predefined questions but cannot interact with external systems or make autonomous decisions.

**Exam Tip:** Agentic AI = autonomous reasoning + tool use + action execution. It's more than just answering questions.

</details>

---

### Question 24
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

A logistics company wants to optimize delivery routes in real-time based on traffic patterns, weather conditions, and package priorities. The system should continuously improve its recommendations based on delivery outcomes. Which AI capability best describes what the company needs?

- A) Robotic Process Automation (RPA) to automate route selection
- B) Machine Learning to learn optimal patterns from historical and real-time data
- C) Natural Language Processing to interpret delivery instructions
- D) Computer Vision to read traffic signs along routes

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Machine Learning is ideal because it can analyze multiple data inputs (traffic, weather, priorities), learn from historical outcomes, and continuously improve predictions based on delivery results.

**Why not A:** RPA automates repetitive rule-based tasks but cannot learn from outcomes or handle dynamic optimization with multiple variables.

**Why not C:** NLP processes language but doesn't optimize routes based on numerical patterns and real-time conditions.

**Why not D:** Computer Vision analyzes images but cannot perform the complex optimization and pattern learning required for route planning.

**Exam Tip:** When a scenario mentions 'learning from outcomes' or 'continuous improvement,' Machine Learning is typically the answer.

</details>

---

### Question 25
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** easy

What term describes AI systems that can explain their reasoning and decision-making process to humans?

- A) Autonomous AI
- B) Explainable AI (XAI)
- C) Supervised AI
- D) Reinforcement AI

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Explainable AI (XAI) refers to AI systems designed to provide clear explanations of how they reach decisions, making their reasoning transparent and interpretable to humans.

**Why not A:** Autonomous AI refers to systems that operate independently, not necessarily with transparent reasoning.

**Why not C:** Supervised AI refers to a machine learning approach using labeled training data, not explainability.

**Why not D:** Reinforcement AI (reinforcement learning) is a training approach using rewards, unrelated to explanation capabilities.

**Exam Tip:** Explainable AI is crucial for trust and responsible AI—it helps humans understand why an AI made a specific decision.

</details>

---

### Question 26
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** easy

What is the primary difference between image classification and object detection in computer vision?

- A) Image classification is faster than object detection
- B) Image classification assigns labels to entire images, while object detection locates and identifies multiple objects within an image
- C) Object detection works only on videos, not images
- D) Image classification requires more training data than object detection

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Image classification provides one or more labels for the entire image (e.g., 'beach scene'), while object detection identifies specific objects AND their locations (bounding boxes) within the image.

**Why not A:** Speed depends on model complexity and hardware, not inherently on the task type.

**Why not C:** Object detection works on both images and video frames—the distinction is about what information is extracted, not input format.

**Why not D:** Training data requirements depend on model complexity and use case, not categorically on the task type.

**Exam Tip:** Classification = 'What is this image of?' | Object Detection = 'What objects are in this image and WHERE are they?'

</details>

---

### Question 27
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

Which scenario represents an example of weak AI (narrow AI) rather than strong AI (general AI)?

- A) A system that can perform any intellectual task a human can do
- B) A virtual assistant that can book appointments, answer questions, and control smart home devices
- C) An AI that develops emotional understanding and consciousness
- D) A robot that can independently learn new skills without any human guidance

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

A virtual assistant, even with multiple capabilities, is narrow AI because it's designed for specific, limited tasks within defined parameters—it cannot generalize to completely new domains.

**Why not A:** A system performing ANY intellectual task describes strong AI/AGI, which doesn't exist today.

**Why not C:** Emotional understanding and consciousness describe theoretical strong AI characteristics, not current narrow AI.

**Why not D:** Independent learning of entirely new skills without guidance describes hypothetical AGI capabilities.

**Exam Tip:** All current AI applications are narrow AI—they excel at specific tasks but cannot generalize to arbitrary new domains.

</details>

---

### Question 28
**Domain:** Welcome to the World of AI: What Makes Machines Smart? | **Difficulty:** medium

A museum wants to create an interactive exhibit where visitors can have spoken conversations in multiple languages about artwork. The system should understand speech, respond naturally, and work in various languages. Which combination of AI capabilities is required?

- A) Computer Vision and Machine Learning
- B) Speech Recognition, Natural Language Processing, Speech Synthesis, and Translation
- C) Generative AI and Robotic Process Automation
- D) Knowledge Mining and Document Intelligence

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

This requires Speech Recognition (understanding spoken input), NLP (comprehending meaning and generating responses), Speech Synthesis (converting responses to speech), and Translation (handling multiple languages).

**Why not A:** Computer Vision would help identify artwork, but the core requirement is conversational AI capabilities across languages.

**Why not C:** While Generative AI could help generate responses, RPA is for business process automation, not conversational interfaces.

**Why not D:** Knowledge Mining extracts insights from documents; Document Intelligence processes forms—neither enables spoken multilingual conversation.

**Exam Tip:** Conversational AI scenarios typically require speech services (input/output) combined with language understanding and generation.

</details>

---

### Question 29
**Domain:** The AI Revolution: Generative AI and Azure OpenAI | **Difficulty:** medium

What is the primary purpose of a system message (system prompt) when configuring an Azure OpenAI chat completion?

- A) To authenticate the API request and validate user credentials
- B) To define the AI assistant's behavior, personality, and constraints
- C) To specify the maximum number of tokens in the response
- D) To encrypt the conversation for security compliance

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

The system message establishes the AI's persona, sets behavioral guidelines, defines what topics to discuss or avoid, and provides context that shapes how the assistant responds to user messages.

**Why not A:** Authentication is handled through API keys and Azure AD, not through the system message.

**Why not C:** Max tokens is a separate parameter in the API call, not defined in the system message.

**Why not D:** Encryption is handled at the transport and storage layer, not through prompt configuration.

**Exam Tip:** System messages control AI behavior and personality—they're your primary customization tool.

</details>

---

### Question 30
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** easy

Why is human oversight important in AI systems according to Microsoft's responsible AI guidelines?

- A) AI systems are always slower than humans at making decisions
- B) Humans can intervene when AI makes errors and ensure appropriate use in context
- C) Human oversight is only required for AI systems costing over $100,000
- D) AI cannot function without constant human input for every decision

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Human oversight ensures that people can monitor AI behavior, intervene when necessary, and apply contextual judgment that AI may lack—maintaining ultimate human control over impactful decisions.

**Why not A:** AI is often faster than humans; speed isn't why human oversight matters—it's about judgment, ethics, and intervention capability.

**Why not C:** The need for human oversight is based on impact and risk, not financial cost of the AI system.

**Why not D:** AI can operate autonomously; human oversight means maintaining the ability to intervene, not requiring constant input.

**Exam Tip:** Human oversight is about maintaining control and intervention capability, not about humans doing the AI's job.

</details>

---

### Question 31
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** medium

A data science team needs to develop multiple AI applications that share common data sources and security policies. They want centralized management of AI resources while allowing individual projects to maintain their own development workflows. Which Azure AI Foundry organizational approach best fits this requirement?

- A) Create separate Azure subscriptions for each AI project
- B) Use a single hub with multiple projects connected to it
- C) Deploy independent Azure AI services for each application
- D) Use Azure Machine Learning workspaces without AI Foundry

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Foundry's hub-and-project model allows a hub to provide centralized management of shared resources, data connections, and security policies, while individual projects enable teams to work independently on specific applications.

**Why not A:** Separate subscriptions would fragment management and prevent easy sharing of common resources and policies.

**Why not C:** Independent services lack centralized management and would require duplicating security and data configurations.

**Why not D:** Azure Machine Learning workspaces alone don't provide the generative AI tooling and centralized hub management that AI Foundry offers.

**Exam Tip:** Hubs provide centralized governance; projects enable team-specific development—this is core to AI Foundry architecture.

</details>

---

### Question 32
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** medium

A financial services company deploys an AI credit scoring system. When customers are denied credit, they receive only a message saying 'Application denied based on AI assessment.' Customers have no way to understand why or appeal the decision. Which TWO responsible AI principles are being violated?

- A) Reliability and Safety
- B) Transparency and Accountability
- C) Privacy and Security
- D) Inclusiveness and Fairness

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Transparency is violated because customers cannot understand how decisions are made. Accountability is violated because there's no way to appeal or have human oversight of consequential AI decisions.

**Why not A:** Reliability relates to consistent performance, and Safety relates to preventing harm—the issue here is lack of explanation and recourse.

**Why not C:** Privacy and Security concern data protection—the scenario describes issues with decision transparency, not data handling.

**Why not D:** While these could be concerns, the explicit violations shown are inability to understand decisions (transparency) and lack of appeal process (accountability).

**Exam Tip:** High-impact AI decisions (credit, healthcare, employment) require both transparency about reasoning AND mechanisms for human oversight and appeals.

</details>

---

### Question 33
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** easy

What is the primary benefit of using the Azure AI Foundry model catalog?

- A) It provides free access to all AI models without any Azure subscription
- B) It offers a curated selection of models from Microsoft and partners that can be deployed to Azure
- C) It automatically trains custom models using your organization's data
- D) It exclusively hosts open-source models that can be downloaded locally

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

The model catalog provides a curated collection of foundation models from Microsoft, OpenAI, Meta, Hugging Face, and other partners, allowing developers to browse, compare, and deploy models directly to Azure infrastructure.

**Why not A:** Models in the catalog require an Azure subscription, and usage incurs costs based on the model and deployment type.

**Why not C:** The catalog provides pre-trained models; custom training requires separate processes using Azure Machine Learning or fine-tuning capabilities.

**Why not D:** The catalog includes both proprietary and open-source models, designed for cloud deployment rather than local download.

**Exam Tip:** The model catalog is your one-stop shop for discovering and deploying various AI models in Azure.

</details>

---

### Question 34
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** medium

A company needs to build a customer support bot that can handle conversations in English, Spanish, and French, understanding natural language variations and maintaining context throughout the conversation. Which Azure service combination would be MOST appropriate?

- A) Azure Functions with custom translation code
- B) Azure AI Language with Conversational Language Understanding and Azure Bot Service
- C) Azure Cognitive Search with multilingual analyzers
- D) Azure Speech Services with language detection only

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Language provides Conversational Language Understanding (CLU) with multilingual support for intent recognition and entity extraction, while Azure Bot Service handles the conversational framework and context management across languages.

**Why not A:** Custom code in Functions would require building NLU capabilities from scratch without the pre-built language understanding features.

**Why not C:** Cognitive Search is for document retrieval, not conversational understanding or dialog management.

**Why not D:** Speech Services handles audio but doesn't provide the intent understanding or conversation management needed for a support bot.

**Exam Tip:** CLU + Bot Service is the standard pattern for building intelligent multilingual chatbots on Azure.

</details>

---

### Question 35
**Domain:** Exam Day Success: AI-901 Review and Test Strategies | **Difficulty:** medium

You encounter an AI-901 question that asks: 'A company wants to extract text from scanned invoices. Which service should they use?' The options include Azure AI Vision, Azure AI Document Intelligence, Azure AI Language, and Azure OpenAI. What is the key distinction that identifies the correct answer?

- A) Azure AI Vision because all image processing goes through Vision services
- B) Azure AI Document Intelligence because it specializes in extracting structured data from documents
- C) Azure AI Language because invoices contain text that needs language processing
- D) Azure OpenAI because GPT-4 can understand images

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Document Intelligence (formerly Form Recognizer) is specifically designed for extracting structured information from documents like invoices, with pre-built models for common document types. This specialization makes it the best fit.

**Why not A:** While Vision can do OCR, Document Intelligence is purpose-built for structured document extraction with invoice-specific capabilities.

**Why not C:** Language services process text that's already extracted; they don't extract text from scanned images.

**Why not D:** While GPT-4 Vision can read images, Document Intelligence provides specialized, production-ready invoice extraction.

**Exam Tip:** Document Intelligence = structured document extraction. Vision = general image analysis. Know the specializations!

</details>

---

### Question 36
**Domain:** Building AI with a Conscience: Responsible AI Principles | **Difficulty:** hard

A healthcare organization discovers that their AI diagnostic tool performs with 95% accuracy for patients from demographic Group A but only 72% accuracy for patients from demographic Group B. The training data contained 85% Group A patients. Which responsible AI principle was primarily violated, and what is the root cause?

- A) Privacy principle violated due to collecting demographic information
- B) Fairness principle violated due to unrepresentative training data causing biased performance
- C) Transparency principle violated due to not explaining accuracy differences
- D) Reliability principle violated due to inconsistent performance metrics

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

This is a Fairness violation caused by unrepresentative training data. The model learned patterns primarily from Group A, creating disparate performance that could lead to unequal healthcare outcomes.

**Why not A:** Collecting demographic data isn't inherently a privacy violation—in fact, it's necessary to detect and address fairness issues.

**Why not C:** While transparency about accuracy differences is important, the core issue is unfair outcomes, not lack of explanation.

**Why not D:** Reliability concerns consistent performance over time and conditions—this is specifically about unequal performance across groups (fairness).

**Exam Tip:** When AI performs differently across demographic groups, it's a fairness issue—often caused by unbalanced or unrepresentative training data.

</details>

---

### Question 37
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** hard

A hotel chain is implementing a virtual concierge that should be able to book spa appointments, order room service, and arrange transportation—all by connecting to different backend systems via APIs. The assistant should intelligently decide which service to call based on guest requests. Which capability is MOST critical for this implementation?

- A) Sentiment analysis to understand guest emotions
- B) Function calling (tool use) to invoke appropriate APIs based on user intent
- C) Speech synthesis for natural-sounding voice responses
- D) Document summarization for condensing service information

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Function calling enables the AI to intelligently select and invoke the correct backend APIs (spa booking, room service, transportation) based on understanding the guest's request—this is the core capability needed for action-oriented assistants.

**Why not A:** Sentiment analysis helps understand emotions but doesn't enable the assistant to actually book services or call APIs.

**Why not C:** Speech synthesis improves voice output quality but doesn't address the core need of connecting to and invoking backend services.

**Why not D:** Document summarization is for condensing text, not for executing booking or ordering actions.

**Exam Tip:** Function calling is how AI assistants take real actions—it bridges conversation to backend systems.

</details>

---

### Question 38
**Domain:** Building Smart Assistants: Agentic AI and Conversational AI | **Difficulty:** medium

What is the key difference between conversational AI and agentic AI?

- A) Conversational AI uses natural language while agentic AI only uses structured commands
- B) Conversational AI focuses on dialog interaction while agentic AI can autonomously plan and execute multi-step tasks
- C) Agentic AI requires human approval for every action while conversational AI operates independently
- D) Conversational AI is always cloud-based while agentic AI runs only on edge devices

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Conversational AI enables natural language dialog and understanding, while agentic AI adds autonomous reasoning, planning, tool selection, and task execution capabilities—essentially, agents can 'do things' beyond just 'talk about things'.

**Why not A:** Both types can use natural language; the distinction is about autonomy and action-taking, not input format.

**Why not C:** The relationship is reversed—agentic AI has MORE autonomy to act independently, though human oversight is a design choice.

**Why not D:** Deployment location (cloud vs edge) is independent of whether AI is conversational or agentic.

**Exam Tip:** Conversational AI = talking; Agentic AI = talking + autonomous reasoning + doing.

</details>

---

### Question 39
**Domain:** Meet Microsoft Foundry: Your AI Development Hub | **Difficulty:** medium

When setting up a new Azure AI Foundry project, a developer needs to ensure that all AI models used in the project can access the company's proprietary product database stored in Azure Blob Storage. Where should this connection be configured for maximum reusability?

- A) Within each individual prompt flow that needs database access
- B) At the hub level so all projects can share the connection
- C) In the Azure portal's networking settings only
- D) Through environment variables in the deployment configuration

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Configuring data connections at the hub level allows all projects under that hub to inherit and share the connection, providing centralized management, consistent security policies, and maximum reusability.

**Why not A:** Configuring in each prompt flow creates duplication, increases maintenance burden, and risks inconsistent configurations.

**Why not C:** Networking settings alone don't establish the data connection configuration needed for AI Foundry to access the data.

**Why not D:** Environment variables in deployment don't provide the centralized, managed connection capability that hub-level configuration offers.

**Exam Tip:** Hub-level configurations (like data connections) are inherited by all projects—this enables governance and reusability.

</details>

---

### Question 40
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** easy

A small business owner with no coding experience wants to build a machine learning model to predict customer churn using their sales data stored in a CSV file. Which Azure service is most appropriate?

- A) Azure Databricks with PySpark
- B) Azure Machine Learning Automated ML (AutoML)
- C) Azure Kubernetes Service for model deployment
- D) Azure Synapse Analytics

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure Machine Learning AutoML allows users to upload data and automatically build ML models without coding. It handles feature engineering, algorithm selection, and hyperparameter tuning—perfect for non-programmers.

**Why not A:** Databricks with PySpark requires programming knowledge and is suited for data engineers working with big data.

**Why not C:** AKS is for deploying containers at scale—it's an infrastructure service, not an ML model building tool.

**Why not D:** Synapse Analytics is for big data analytics and warehousing, not specifically for building predictive ML models for business users.

**Exam Tip:** AutoML is the go-to answer for 'no coding experience' + 'build ML model' scenarios.

</details>

---

### Question 41
**Domain:** Giving Machines Eyes: Computer Vision on Azure | **Difficulty:** medium

A government agency needs to process thousands of handwritten historical documents to create a searchable digital archive. The documents contain various handwriting styles from different eras. Which Azure service should they use?

- A) Azure AI Vision Image Analysis
- B) Azure AI Document Intelligence with custom models
- C) Azure Custom Vision for classification
- D) Azure AI Vision Face service

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Azure AI Document Intelligence provides advanced OCR capabilities including handwriting recognition, and custom models can be trained to handle specific document formats and historical handwriting styles.

**Why not A:** Azure AI Vision provides general OCR but Document Intelligence is specifically designed for document processing with better handling of complex layouts and handwriting.

**Why not C:** Custom Vision is for image classification and object detection, not text extraction from documents.

**Why not D:** Face service detects and analyzes faces, which is unrelated to document text extraction.

**Exam Tip:** For document-heavy scenarios with forms, handwriting, or complex layouts, Document Intelligence is typically the right choice over general Vision OCR.

</details>

---

### Question 42
**Domain:** Teaching Machines to Learn: ML Fundamentals | **Difficulty:** medium

A streaming service wants to automatically organize its massive library of unlabeled songs into groups based on audio characteristics like tempo, energy, and mood—without predefined categories. Which machine learning approach should they use?

- A) Supervised learning with multi-class classification
- B) Unsupervised learning with clustering algorithms
- C) Reinforcement learning with reward functions
- D) Supervised learning with regression

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: B**

Unsupervised learning with clustering is ideal because the data is unlabeled and the goal is to discover natural groupings based on feature similarities—exactly what clustering algorithms do.

**Why not A:** Supervised classification requires labeled training data with predefined categories, which the scenario explicitly states are not available.

**Why not C:** Reinforcement learning requires defining rewards for actions in an environment—organizing a static music library isn't an action-reward scenario.

**Why not D:** Regression predicts continuous numerical values, not group memberships, and also requires labeled training data.

**Exam Tip:** No labels + want to find natural groups = Unsupervised Clustering. This is a classic clustering use case.

</details>

---

## Answer Key

| Q | Answer | Domain | Difficulty |
|---|--------|--------|-----------|
| 1 | B | Building AI with a Conscience: Responsible AI Principles | medium |
| 2 | B | Exam Day Success: AI-901 Review and Test Strategies | hard |
| 3 | B | Giving Machines Eyes: Computer Vision on Azure | medium |
| 4 | B | Teaching Machines to Learn: ML Fundamentals | medium |
| 5 | B | Teaching Machines to Learn: ML Fundamentals | hard |
| 6 | B | The AI Revolution: Generative AI and Azure OpenAI | hard |
| 7 | B | Exam Day Success: AI-901 Review and Test Strategies | easy |
| 8 | B | Building AI with a Conscience: Responsible AI Principles | easy |
| 9 | B | The AI Revolution: Generative AI and Azure OpenAI | medium |
| 10 | B | Building Smart Assistants: Agentic AI and Conversational AI | easy |
| 11 | B | The AI Revolution: Generative AI and Azure OpenAI | medium |
| 12 | A | Building Smart Assistants: Agentic AI and Conversational AI | medium |
| 13 | B | Building AI with a Conscience: Responsible AI Principles | hard |
| 14 | B | Teaching Machines to Learn: ML Fundamentals | medium |
| 15 | B | Meet Microsoft Foundry: Your AI Development Hub | medium |
| 16 | B | Welcome to the World of AI: What Makes Machines Smart? | hard |
| 17 | B | The AI Revolution: Generative AI and Azure OpenAI | easy |
| 18 | B | Teaching Machines to Learn: ML Fundamentals | hard |
| 19 | B | The AI Revolution: Generative AI and Azure OpenAI | hard |
| 20 | B | Welcome to the World of AI: What Makes Machines Smart? | easy |
| 21 | B | Meet Microsoft Foundry: Your AI Development Hub | easy |
| 22 | B | Meet Microsoft Foundry: Your AI Development Hub | hard |
| 23 | B | Building Smart Assistants: Agentic AI and Conversational AI | hard |
| 24 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 25 | B | Welcome to the World of AI: What Makes Machines Smart? | easy |
| 26 | B | Giving Machines Eyes: Computer Vision on Azure | easy |
| 27 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 28 | B | Welcome to the World of AI: What Makes Machines Smart? | medium |
| 29 | B | The AI Revolution: Generative AI and Azure OpenAI | medium |
| 30 | B | Building AI with a Conscience: Responsible AI Principles | easy |
| 31 | B | Meet Microsoft Foundry: Your AI Development Hub | medium |
| 32 | B | Building AI with a Conscience: Responsible AI Principles | medium |
| 33 | B | Meet Microsoft Foundry: Your AI Development Hub | easy |
| 34 | B | Building Smart Assistants: Agentic AI and Conversational AI | medium |
| 35 | B | Exam Day Success: AI-901 Review and Test Strategies | medium |
| 36 | B | Building AI with a Conscience: Responsible AI Principles | hard |
| 37 | B | Building Smart Assistants: Agentic AI and Conversational AI | hard |
| 38 | B | Building Smart Assistants: Agentic AI and Conversational AI | medium |
| 39 | B | Meet Microsoft Foundry: Your AI Development Hub | medium |
| 40 | B | Teaching Machines to Learn: ML Fundamentals | easy |
| 41 | B | Giving Machines Eyes: Computer Vision on Azure | medium |
| 42 | B | Teaching Machines to Learn: ML Fundamentals | medium |

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
