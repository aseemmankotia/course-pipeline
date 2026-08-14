# Designing Connected Products: IoT Architecture From Device to Cloud

**A practitioner's course for engineers becoming platform architects.**

---

## About this course

Most IoT courses teach you how to connect a Raspberry Pi to a cloud service. This one teaches you how to design a platform that 10 million devices depend on, where a wrong architectural choice shows up in the P&L and in customer support queues six months later.

The material is organized around a single question that experienced architects ask constantly: *what are we trading off, and is the trade defensible?* Every lesson ends with a tradeoff matrix you can defend in a design review, and every case study walks through real decisions — including the ones that turned out wrong.

This is a course for engineers moving into architect roles, technical leads who own platform decisions, and senior ICs who want to stop being handed decisions and start making them.

## Who this course is for

- Senior engineers with 5+ years building production systems who are moving into architect or tech-lead roles
- Platform engineers who own shared services consumed by product teams
- Backend engineers with cloud experience who need IoT-specific depth (device identity, offline resilience, fleet management, telemetry fan-out)
- Embedded engineers who want to understand the cloud side of the products they ship into

The course assumes working knowledge of distributed systems fundamentals (pub/sub, queues, consensus basics), at least one major cloud provider, and comfort reading code in more than one language. It does not assume any prior IoT experience.

## What you will be able to do by the end

- Design end-to-end architectures spanning firmware, device gateway, cloud platform, and applications, with written decision records that survive scrutiny
- Evaluate the three protocol families (MQTT, AMQP, CoAP) and pick one with a defensible rationale
- Size a real fleet: partition counts, throughput units, storage tiers, and cost projections grounded in actual numbers
- Design for the IoT-specific failure modes that break naive architectures: intermittent connectivity, reconnection storms, silent device failures, firmware rollback, hot partitions
- Build observability and security into the architecture from day one, not as layers added later
- Make the edge-vs-cloud inference decision for AI/ML workloads based on latency, privacy, and cost — not on which is trendier
- Communicate tradeoffs to both engineers and business stakeholders in the language each one uses

## Course format

Twelve modules. Each module has ~90 minutes of video lecture, a written reference document, a hands-on lab on a real cloud platform (primarily Azure, with AWS equivalents called out), and a design exercise graded against a rubric. Five case studies thread through the course — we revisit each one as new concepts unlock new decisions.

---

## Module 1 — The mental model

The shape of every connected product: device → gateway → cloud platform → consumer applications. Why this layering exists, what each layer is actually responsible for, and the three or four questions that determine every architectural decision downstream.

Key concepts: layers of responsibility, the difference between a device gateway and a message broker, why devices don't talk to databases, the CAP theorem specifically applied to IoT.

Deliverable: draw the reference architecture for a product of the student's choice and justify each layer.

## Module 2 — Protocols and the physics of constrained devices

MQTT, AMQP, CoAP, HTTP/2, WebSocket. What each one optimizes for, what it costs in power and bandwidth, and when the protocol choice constrains every decision above it. How TLS, DTLS, and certificate-based auth change the calculus. The hybrid pattern: CoAP at the edge, MQTT to the cloud, and why it exists.

Key concepts: QoS levels, keep-alives and their power cost, message size vs payload density, protocol translation gateways, cellular vs WiFi vs LPWAN implications.

Deliverable: protocol selection matrix for three device classes (battery sensor, mains-powered appliance, high-bandwidth camera).

## Module 3 — Device identity, provisioning, and the manufacturing handoff

The real problem: you manufacture a million devices in a factory you don't own, they sit on shelves for six months, and they need to securely enroll the first time they power on at a customer's home. Certificate provisioning at manufacturing scale, the role of hardware security modules and TPM, zero-touch provisioning services (Azure DPS, AWS IoT Device Management), certificate rotation at scale, and what happens when a signing key is compromised.

Key concepts: X.509 hierarchies, SAS tokens vs certificates, attestation mechanisms, group enrollment vs individual enrollment, supply chain trust.

Deliverable: design a provisioning flow for a product manufactured at a third-party factory and activated six months later.

## Module 4 — Telemetry at scale

Partitioning, throughput units, fan-out, consumer groups, replay. Why Event Hubs and Kafka look similar but differ in specific ways that matter. Picking partition keys without painting yourself into a corner. The hot partition problem and how to detect it before it becomes a customer problem. Message routing: splitting a single device stream into hot-path analytics, cold-path archival, and alert-path workflows without duplicating work.

Key concepts: partition keys and cardinality, offset management, checkpointing, exactly-once semantics and its costs, message enrichment at ingestion, schema evolution.

Deliverable: partitioning design for a 10M-device fleet with growth to 40M over three years, including the math and the failure modes.

## Module 5 — Commands, state, and the device twin pattern

Why synchronous "call the device" patterns fail at scale, and the declarative alternative. Device twins in Azure IoT Hub, shadows in AWS IoT, and the general pattern they both implement. Direct methods for synchronous commands and when they're still the right tool. Handling offline devices gracefully: converging state when a device reconnects after three days.

Key concepts: desired vs reported properties, convergence, eventual consistency as a feature, tags and queries, twin size limits and what they force you to do.

Deliverable: design the command and configuration system for a smart thermostat product, including the offline recovery path.

## Module 6 — Firmware OTA: the feature that can brick your fleet

Every architect eventually ships a firmware update that makes a percentage of devices unreachable. The goal is for that percentage to be small and recoverable. A/B partition schemes, bootloader rollback, canary ring deployment patterns, delta updates for bandwidth-constrained devices, and the workflow orchestration that ties it all together. Why Service Bus (or similar reliable queues) owns rollout coordination even though the actual device communication goes through IoT Hub.

Key concepts: signed firmware images, ring-based staged rollouts, convergence metrics, auto-rollback triggers, declarative state applied to firmware versions.

Deliverable: OTA system design including rollback, with a written post-mortem of a hypothetical failed rollout.

## Module 7 — Offline resilience and the reconnection storm

Intermittent connectivity is the IoT architect's defining problem. Device-side buffering, clock drift, message deduplication on the cloud side, idempotent command handling, and the reconnection storm that happens when an ISP outage ends and a million devices reconnect in the same ten seconds. Rate limiting at the gateway layer, jittered reconnect on the device side, and the architectural patterns that make outages recoverable without operator intervention.

Key concepts: exponential backoff with jitter, message sequence numbers, idempotency keys, quota management per device, degraded-mode operation.

Deliverable: failure-mode analysis for a product of the student's choice, with mitigation for each identified mode.

## Module 8 — Observability for fleets

Observability at 10M devices is not a bigger version of observability at 10 devices. Per-device logs don't scale; aggregate signals do. The five meanings of "offline" and how to design a system where each one is diagnosable in minutes. Correlation IDs propagated end-to-end, sampling strategies, tiered log retention, and the operator-tool investment that pays back the first time an executive asks "why are a million devices in Texas offline?"

Key concepts: structured logging, distributed tracing across device-to-cloud boundary, fleet-level dashboards vs per-device queries, observability cost management, anomaly detection on operational metrics.

Deliverable: observability plan for an existing architecture, including specific queries support engineers will run and what infrastructure makes those queries fast.

## Module 9 — Security beyond authentication

Authentication is table stakes. The rest of the iceberg: secrets management, key rotation at scale, data-plane encryption with rotating keys, zero-trust between cloud services, secure enclaves for sensitive workloads, privacy-preserving telemetry (differential privacy, on-device aggregation), regulatory requirements (GDPR for home data, UL certifications for safety devices), and the threat models that actually apply to consumer IoT (not the ones in security textbooks).

Key concepts: defense in depth, blast radius reduction, secret rotation without downtime, secure boot chains, tamper detection, privacy as an architectural concern.

Deliverable: threat model for a specific product class with ranked mitigations and explicit residual risk acceptance.

## Module 10 — Edge compute and the inference placement decision

The question isn't "edge or cloud" — it's "which decision at which latency, at what cost, with what privacy implications." How to reason about ML inference placement: on-device (lowest latency, hardest to update), gateway (shared compute, local network), near-edge (regional, low latency, cloud update path), cloud (unlimited compute, worst latency). The update problem for on-device models. Hybrid patterns where the device does detection and the cloud does analysis.

Key concepts: model quantization, hardware accelerators in consumer devices, model update as a firmware problem, inference-as-telemetry patterns, federated learning basics.

Deliverable: inference-placement decision for three features (wake-word detection, anomaly detection on sensor data, personalization), with tradeoffs written out.

## Module 11 — Building evolvable platforms other teams depend on

The transition from building a product to building a platform. Interface contracts, SDK design, reference implementations, and the art of making your decisions reversible. Avoiding the two failure modes: platforms that lock teams in with too much opinion, and platforms that abstract nothing and leave teams to reinvent wheels. Versioning strategies, deprecation, and the developer experience work that determines whether your platform gets adopted or routed around.

Key concepts: platform vs framework, extension points, golden paths, backward compatibility policies, SDK generation, internal developer documentation.

Deliverable: platform design for a shared telemetry service consumed by five product teams, with the API contract, extension points, and migration path to v2 all specified.

## Module 12 — Influence, decision records, and architect communication

The skill that separates senior engineers from architects: communicating decisions in a way that survives personnel changes and persuades people who disagree. Architecture Decision Records (ADRs) that actually get read. The diagram types that work for different audiences. Running design reviews without dominating them. Saying no to bad ideas without damaging relationships. Writing for executives who have fifteen seconds. The first 90 days in a new architect role.

Key concepts: ADR templates, C4 diagrams, technical writing for non-technical readers, consensus vs authority, influence without authority across organizational boundaries.

Deliverable: ADR for the student's capstone design, reviewed by peers.

---

## Case studies

These five case studies thread through the course. Each one is introduced early, revisited repeatedly as new concepts apply, and concluded with a full-stack architectural review in Module 12. They are chosen to cover the spectrum of connected product challenges: safety, bandwidth, battery, privacy, and regulatory constraints.

### Case study 1 — Smart thermostat at 10M+ scale

**The product:** A connected thermostat that learns household patterns, integrates with utility demand-response programs, and coordinates with other devices (water heater, EV charger). Mains-powered, WiFi-connected, always-on. Customers expect ten-year device lifetimes.

**Core challenges:**

- Telemetry volume: temperature, humidity, HVAC state, and derived signals from 10M devices every 60 seconds is ~167K messages per second sustained, ~14B messages per day. Cold storage retention for two years for analytics and ML training is ~10PB raw.
- Demand-response integration: utility sends a signal during peak load; up to a million devices need to reduce setpoint within a 60-second window. This is a command fan-out problem, not a telemetry problem.
- Firmware update safety: a bad update that makes the thermostat unresponsive during a heat wave is a safety event, not just a quality event. A/B partitions and bootloader rollback are non-negotiable.
- Privacy: occupancy inference from temperature patterns is sensitive. Design decisions about what leaves the device and what stays on it are privacy-by-design choices, not compliance afterthoughts.

**Architectural tradeoffs explored:**

- Telemetry frequency as a product decision, not a technical decision. Reducing to 5-minute reporting cuts ingestion cost by 5x but reduces the quality of the learning algorithm. The architect's job is to surface this to product management with numbers, not to make the decision unilaterally.
- Storage tiering: hot tier for last seven days supports real-time diagnostics; cool tier for 30 days supports customer support queries ("show me last month's heating pattern"); archive tier for two years supports ML training. Lifecycle policies automate transitions. Decision: aggregate hourly rollups live in hot tier forever; raw data ages out. This is cheaper than keeping raw data hot and answers 95% of queries.
- Demand-response command fan-out: device twin desired property updates vs direct methods. Twin updates handle offline devices gracefully but have minutes of latency; direct methods are immediate but fail for any disconnected device. The answer for this scenario is twin-based with a 60-second timeout window and graceful degradation when the participation rate is below target.
- Partition key choice: `deviceId` distributes uniformly across 10M devices; `utilityGridRegion` would create massive hot partitions during demand-response events. Design decision forces you to handle regional events at the consumer layer, not the partition layer.

**What goes in the ADR:** telemetry frequency and its product tradeoff, storage tiering policy with cost projection, command delivery semantics with latency SLO, partition strategy with growth path to 40M devices, firmware update rollback mechanism.

### Case study 2 — Battery-powered leak detector fleet

**The product:** A small, cheap water-leak detector that lives in basements and under sinks, runs on two AA batteries for a claimed five-year lifetime, and connects via a mesh protocol to a hub that relays to the cloud. Reports sensor readings once per hour under normal conditions, immediately when a leak is detected.

**Core challenges:**

- Battery lifetime dictates everything. A persistent TCP connection with MQTT keep-alives would drain the batteries in weeks. The device must sleep 99.9% of the time.
- Mesh network topology: devices don't have internet; they relay through a hub. The hub is the actual cloud-connected device from the platform's perspective. Device identity and provisioning must span both layers.
- Alert latency: a leak detected at 2am must reach the homeowner's phone within seconds. Normal operation is high-latency; alert operation is low-latency. The architecture must support both without keeping the radio hot continuously.
- Deployment in locations with unreliable WiFi. The hub must buffer locally during outages and recover gracefully.

**Architectural tradeoffs explored:**

- Protocol choice: CoAP over 802.15.4 for device-to-hub, MQTT from hub to cloud. This is the classic hybrid pattern, and the course walks through why each layer picks what it picks. The CoAP Observe extension handles the low-power "push" case; MQTT handles the reliable cloud delivery.
- Identity layering: device certificates are issued at manufacturing but used only between device and hub. The hub has its own cloud identity. The platform has to reason about which device generated which event, which requires cryptographic attestation all the way from device to cloud. The tradeoff is complexity vs trust model strength.
- Batching strategy for routine telemetry: the hub batches hourly reports from 20 devices into a single cloud message, reducing message count and cost. But alerts bypass the batch and go immediately. Designing this dual-path without bugs is harder than it looks.
- Firmware updates to battery devices: you cannot download a 500KB firmware image to a device that only wakes for 100ms every hour. Delta updates and months-long rollout windows are the norm. Discuss when to not update and accept older firmware on a subset of the fleet indefinitely.
- Data collection frequency and privacy: the device knows when water flows in a house. With enough resolution, this leaks information about the occupants' routines. Decision: store aggregated daily summaries long-term, discard raw minute-level data after 30 days unless the customer opts into longer retention for diagnostics. Privacy-by-design at the architectural level.

**What goes in the ADR:** battery budget accounting per protocol decision, mesh topology and identity propagation, alert path SLO and how it's honored, firmware update cadence and deferral policy, data retention and aggregation schedule with privacy rationale.

### Case study 3 — Security camera with on-device AI

**The product:** An outdoor camera with a built-in neural network accelerator. Does motion detection, person/vehicle classification, and package delivery recognition on-device. Uploads video clips to the cloud only when classified events occur. Customers pay a monthly subscription for cloud recording, extended AI features, and multi-camera alert coordination.

**Core challenges:**

- Bandwidth is expensive on both sides. Uploading continuous 1080p video from 500K cameras would saturate most residential uplinks and bankrupt the cloud egress bill. On-device inference is not an optimization — it is the business model.
- Model updates: the on-device ML model improves every few months. Pushing new models to the fleet is essentially a firmware update, but bigger (models are tens of megabytes) and more frequent. The update cadence has to balance model quality against device storage and bandwidth.
- Cloud-side inference for subscription features: "was that the package I was expecting?" requires a larger model than fits on-device. These run on uploaded clips in the cloud, adding variable-latency compute cost that scales with customer engagement rather than with device count.
- Privacy and regulatory: continuous video of the exterior of people's homes. Neighboring properties end up in the frame. Regulations vary by jurisdiction. Architectural choices (on-device preview vs cloud preview, who can access recordings, how long they're kept) are effectively privacy policy.

**Architectural tradeoffs explored:**

- Inference placement decision in detail: detection on-device, classification on-device for common cases, cloud classification for subscription features, multi-camera correlation always in cloud. Each placement has latency, cost, privacy, and updateability dimensions — walk through all four for each decision.
- Model update as a separate system from firmware update. Firmware is signed by the device team; models are signed by the ML team. Different rollout cadence, different rollback mechanism, different telemetry. The platform needs to support both without making either one a special case of the other.
- Event-triggered upload architecture: device detects event, uploads clip with metadata, cloud processes asynchronously, notifies customer. Where does the inference latency SLO live? If cloud classification takes 30 seconds, the customer sees a "motion detected" alert before they see what the motion was. Do you delay the alert or send it twice? This is an architectural decision that shapes the product experience.
- Subscription-tier enforcement: free-tier users get on-device features only; paid users get cloud features. The boundary must be enforced on the server (never trust the client), but the architecture must degrade gracefully if the cloud is unreachable (on-device features keep working). Graceful degradation as an architectural value, not a feature flag.
- Edge inference hardware as a platform lock-in: choosing an NPU vendor locks you into their quantization toolchain, their model formats, their tooling. Abstraction layers help but don't eliminate this. Discuss the actual long-term cost of this decision.

**What goes in the ADR:** inference placement matrix per feature, model update system design, event-driven upload SLO, subscription boundary architecture, privacy policy as architectural constraints.

### Case study 4 — Industrial leak-monitoring platform (multi-tenant B2B)

**The product:** A platform that ingests telemetry from water-utility customers (municipalities, large industrial operators) who have deployed their own leak-monitoring sensors. The platform provides analytics, alerting, and reporting as a SaaS product. Each tenant has between 100 and 500K devices; the platform serves 50 tenants growing to 500.

**Core challenges:**

- Multi-tenancy isolation: a data leak from one tenant to another is a contractual breach. Isolation must be architectural, not just access-control-at-the-API. This affects database design, stream processing, storage, and observability.
- Tenant-specific customization: each utility has its own sensor types, reporting formats, alert thresholds, and compliance requirements. The platform must be extensible without forking per-tenant. This is where Module 11's platform design concepts earn their keep.
- Variable scale: one tenant has 500K devices, another has 100. The platform must be cost-effective for both without charging the small tenant for dedicated infrastructure. Shared resources with fair-use isolation.
- Regulatory: water utilities report to state and federal agencies. Data retention rules vary; audit logging is legally required; some tenants are subject to public-records requests. These are architectural constraints.

**Architectural tradeoffs explored:**

- Tenancy model: pool vs silo vs bridge. Fully pooled (shared everything) is cheapest but hardest to isolate; fully siloed (per-tenant infrastructure) is most isolated but doesn't scale economically. Bridge (shared platform, tenant-scoped data boundaries) is the usual answer — walk through how to implement it in the three major layers (ingestion, processing, storage).
- Tenant-scoped partitioning: compound partition key like `tenantId:deviceId`. Makes single-tenant queries fast, cross-tenant queries impossible (good for isolation, sometimes inconvenient for platform operators). Discuss when to use separate Event Hubs per tenant vs shared Event Hubs with tenant-scoped keys.
- Customization without forks: the platform exposes extension points (custom sensor drivers, custom alert rules, custom report templates) instead of letting tenants modify the core. Extension points are evaluated in sandboxed environments to prevent one tenant's custom code from affecting another.
- Shared observability with tenant isolation: operators need to see fleet-wide health; individual tenants need to see only their own data. Dual-pipeline logging (raw logs for operators, redacted/scoped logs for tenant-visible dashboards) is one answer. Discuss alternatives.
- Cost attribution: shared infrastructure means someone has to decide how much of the Event Hubs bill belongs to each tenant. Metered usage at the ingestion layer, with fair-use caps, is the pattern. This is architectural because it shapes what can be offered as a product.

**What goes in the ADR:** tenancy model with isolation boundaries, extension architecture with sandboxing mechanism, observability design with redaction rules, cost attribution method, compliance-driven retention and audit requirements.

### Case study 5 — Multi-device home ecosystem orchestration

**The product:** A connected-home platform that coordinates across device categories made by different teams (and in some cases different companies): thermostats, security cameras, leak detectors, smart locks, water heaters. The platform provides cross-device automations ("when the leak detector alerts, turn off the water heater"), unified customer apps, and a partner API for third-party integrators.

**Core challenges:**

- Heterogeneity: devices use different protocols, report different event schemas, have different latency expectations, have different trust boundaries. The platform has to normalize without flattening.
- Automation engine: customers build their own rules ("if motion detected between 10pm and 6am, lock all doors and turn on porch lights"). Runtime for these rules must be fast, reliable, and observable. Failures must be explained to non-technical customers.
- API surface for partners: third-party integrators (Alexa, Google Home, Matter) depend on stable APIs. API versioning, deprecation, rate limiting, and authentication are all architectural concerns with multi-year consequences.
- Cross-device trust: a security camera integrating with a smart lock to unlock the door when it recognizes the homeowner requires a trust model that spans device teams. Who signs the recognition claim? How is it verified? What happens if the camera's ML model is compromised?

**Architectural tradeoffs explored:**

- Event schema design: normalize events to a common schema at ingestion (easier cross-device logic, hides device-specific quirks) or preserve native schemas (higher fidelity, more complex consumers). The course presents both and discusses when each is right. Hybrid: preserve raw events in cold storage, publish normalized events to the automation engine.
- Automation engine architecture: stateless function execution vs long-running stateful workflows. Home automations are mostly stateless ("when X happens, do Y"), but some need state ("don't alert more than once per hour"). Using the wrong pattern makes either simple automations complex or stateful automations unreliable.
- API versioning: GraphQL vs REST vs gRPC for partner APIs, with real discussion of how each ages. GraphQL's schema evolution story is seductive but adds its own complexity. REST with explicit versioning is boring but ages well. Pick one, defend it, live with it for five years.
- Trust model for cross-device interactions: signed event claims, explicit capability grants ("camera can tell lock to unlock"), revocation. Building this well means you can add devices from new partners without renegotiating the security model every time. Building it badly means every integration is a security review.
- Platform vs product tension: as a platform, you want generality; as a product team with shipping deadlines, you want specificity. How architectural choices either empower product teams or slow them down. This is Module 11 made concrete.

**What goes in the ADR:** event schema strategy with migration path, automation engine design with state management model, API versioning policy with deprecation SLA, trust model for cross-device capabilities, and the platform-vs-product governance process.

---

## Capstone project

Over the final three weeks, each student designs the full architecture for an original connected product of their choice, producing:

- A one-page executive summary aimed at a VP of Product
- A full architecture document with diagrams at three levels of detail
- At least five ADRs covering the most consequential decisions
- A written failure-mode analysis
- A cost projection for year 1, 2, and 3 of operation
- A 30-minute design review presented to the cohort, with Q&A graded on how well the architect defends tradeoffs under pressure

The capstone is evaluated against the rubric used in real architect interviews: are the tradeoffs named, is each decision reversible when appropriate, does the architecture survive the failure modes it claims to handle, is it communicable to stakeholders who weren't in the room while it was designed.

---

## What this course deliberately does not cover

Knowing what a course leaves out is part of evaluating what it includes.

- Writing firmware. We discuss firmware as an architectural constraint but do not teach embedded C or RTOS development. Students who need this should take a dedicated embedded systems course alongside.
- Deep cloud certification prep. We use Azure as the primary reference and call out AWS equivalents, but we are not teaching to the AZ-220 or AWS IoT specialty exam. Those exams test breadth of service knowledge; this course teaches depth of architectural judgment.
- Specific ML model architectures. Module 10 covers inference placement and the system-level concerns around model deployment, but does not teach how to train or tune models. A machine learning course is a separate investment.
- Industrial/OT protocols (OPC UA, Modbus, SCADA integration). This course focuses on consumer and light-industrial IoT. Industrial IoT has its own stack and its own course.

---

## Prerequisites and recommended preparation

Before starting, students should be comfortable with the following. If any of these are weak, the linked preparation will close the gap.

- Distributed systems fundamentals: CAP theorem, eventual consistency, pub/sub patterns, consensus at a high level
- At least one major cloud (Azure, AWS, or GCP) at an intermediate level — able to deploy, configure, and troubleshoot managed services
- Reading code in at least two languages; writing production code in at least one
- Basic security literacy: TLS, public-key cryptography, the general shape of certificate-based authentication

Students without cloud experience should complete a cloud-foundations course first. Students without distributed systems background should read Designing Data-Intensive Applications before starting Module 4.

---

## Instructor note on philosophy

Most architecture courses teach patterns. Patterns are useful, but the skill that actually matters is *judgment about which pattern applies, what it costs, and how to defend the choice.* This course is organized around that skill. The case studies are deliberately ambiguous — there is rarely one right answer, and reasonable architects can disagree. Learning to navigate the disagreement productively is the point.

The course is best taken in a cohort where students review each other's designs. Architecture is a social skill as much as a technical one; solo study can teach the technical half but not the part about persuading other engineers to trust your judgment.
