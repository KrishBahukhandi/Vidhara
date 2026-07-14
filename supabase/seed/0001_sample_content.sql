-- 0001_sample_content.sql — DEV SAMPLE CONTENT (delete before real ingestion).
-- Purpose: exercise the full content pipeline + UI with famous, well-known
-- section pairs across all three old⇄new criminal-law mappings.
-- Accuracy policy: act metadata, section numbers, marginal notes, and mapping
-- relationships are well-established facts. Full statutory body text is
-- included ONLY where confidently known; otherwise an honest placeholder marks
-- it pending ingestion from India Code. Provenance recorded on every row.

-- ── acts ─────────────────────────────────────────────────────────────────────
insert into public.acts (id, slug, title, short_title, abbreviation, year, category, status, replaced_by_act_id, enforcement_date, source_url, published_at) values
  ('11111111-1111-4111-8111-111111111102', 'bns',  'The Bharatiya Nyaya Sanhita, 2023',            'BNS',  'BNS',  2023, 'criminal', 'active', null, '2024-07-01', 'https://www.indiacode.nic.in/handle/123456789/20062', now()),
  ('11111111-1111-4111-8111-111111111104', 'bnss', 'The Bharatiya Nagarik Suraksha Sanhita, 2023', 'BNSS', 'BNSS', 2023, 'criminal', 'active', null, '2024-07-01', 'https://www.indiacode.nic.in/handle/123456789/20063', now()),
  ('11111111-1111-4111-8111-111111111106', 'bsa',  'The Bharatiya Sakshya Adhiniyam, 2023',        'BSA',  'BSA',  2023, 'criminal', 'active', null, '2024-07-01', 'https://www.indiacode.nic.in/handle/123456789/20064', now()),
  ('11111111-1111-4111-8111-111111111101', 'ipc',  'The Indian Penal Code, 1860',                  'IPC',  'IPC',  1860, 'criminal', 'replaced', '11111111-1111-4111-8111-111111111102', '1862-01-01', 'https://www.indiacode.nic.in/handle/123456789/2263', now()),
  ('11111111-1111-4111-8111-111111111103', 'crpc', 'The Code of Criminal Procedure, 1973',         'CrPC', 'CRPC', 1973, 'criminal', 'replaced', '11111111-1111-4111-8111-111111111104', '1974-04-01', 'https://www.indiacode.nic.in/handle/123456789/16225', now()),
  ('11111111-1111-4111-8111-111111111105', 'iea',  'The Indian Evidence Act, 1872',                'IEA',  'IEA',  1872, 'criminal', 'replaced', '11111111-1111-4111-8111-111111111106', '1872-09-01', 'https://www.indiacode.nic.in/handle/123456789/2188', now());

-- ── sections ────────────────────────────────────────────────────────────────
-- provenance strings:
--   'dev-sample:text-entered'  → body text hand-entered, verify against India Code before real launch
--   'dev-sample:text-pending'  → body is an explicit placeholder
insert into public.act_sections (id, act_id, number, sort_key, marginal_note, body_md, body_plain, review_status, provenance) values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', '299', 299, 'Culpable homicide',
   'Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide.

*Explanations and illustrations pending ingestion from India Code.*',
   'Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide.',
   'published', 'dev-sample:text-entered'),

  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', '300', 300, 'Murder',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Murder definition pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101', '302', 302, 'Punishment for murder',
   'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
   'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
   'published', 'dev-sample:text-entered'),

  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111101', '375', 375, 'Rape',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Rape definition pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111101', '376', 376, 'Punishment for rape',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Punishment for rape pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111101', '420', 420, 'Cheating and dishonestly inducing delivery of property',
   'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
   'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
   'published', 'dev-sample:text-entered'),

  ('22222222-2222-4222-8222-222222222207', '11111111-1111-4111-8111-111111111102', '100', 100, 'Culpable homicide',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Culpable homicide BNS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222208', '11111111-1111-4111-8111-111111111102', '101', 101, 'Murder',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Murder BNS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222209', '11111111-1111-4111-8111-111111111102', '103', 103, 'Punishment for murder',
   '(1) Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.

(2) When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground, each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine.',
   'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground, each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine.',
   'published', 'dev-sample:text-entered'),

  ('22222222-2222-4222-8222-222222222210', '11111111-1111-4111-8111-111111111102', '63', 63, 'Rape',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Rape BNS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222211', '11111111-1111-4111-8111-111111111102', '64', 64, 'Punishment for rape',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Punishment for rape BNS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222212', '11111111-1111-4111-8111-111111111102', '318', 318, 'Cheating',
   '*Full text pending ingestion from India Code (official source). BNS 318 consolidates the IPC cheating provisions; punishment for cheating that dishonestly induces delivery of property falls under sub-section (4).*',
   'Cheating BNS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222213', '11111111-1111-4111-8111-111111111103', '154', 154, 'Information in cognizable cases',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'FIR information in cognizable cases pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222214', '11111111-1111-4111-8111-111111111104', '173', 173, 'Information in cognizable cases',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'FIR information BNSS pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222215', '11111111-1111-4111-8111-111111111105', '65B', 65.02, 'Admissibility of electronic records',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Admissibility of electronic records pending ingestion',
   'published', 'dev-sample:text-pending'),

  ('22222222-2222-4222-8222-222222222216', '11111111-1111-4111-8111-111111111106', '63', 63, 'Admissibility of electronic records',
   '*Full text pending ingestion from India Code (official source). Section number, title, and mappings are verified.*',
   'Admissibility of electronic records BSA pending ingestion',
   'published', 'dev-sample:text-pending');

-- ── mappings (source = old law, target = new law) ───────────────────────────
insert into public.law_mappings (source_section_id, target_section_id, mapping_type, change_summary_md, review_status, provenance) values
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222207', 'renumbered',
   'Culpable homicide: substance retained; renumbered IPC 299 → BNS 100.', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222208', 'renumbered',
   'Murder definition: substance retained; renumbered IPC 300 → BNS 101.', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222203', '22222222-2222-4222-8222-222222222209', 'modified',
   'Punishment for murder renumbered IPC 302 → BNS 103. **New**: BNS 103(2) prescribes specific punishment where a group of five or more, acting in concert, commits murder on identity grounds (addresses mob lynching).', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222204', '22222222-2222-4222-8222-222222222210', 'modified',
   'Rape definition renumbered IPC 375 → BNS 63 with drafting changes.', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222205', '22222222-2222-4222-8222-222222222211', 'modified',
   'Punishment for rape renumbered IPC 376 → BNS 64 with restructured sub-sections.', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222206', '22222222-2222-4222-8222-222222222212', 'merged',
   'IPC cheating scheme (ss. 415–420) consolidated into BNS 318; IPC 420 (cheating inducing delivery of property) corresponds to BNS 318(4).', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222213', '22222222-2222-4222-8222-222222222214', 'modified',
   'FIR provision renumbered CrPC 154 → BNSS 173 and modernised: electronic FIR recognised and Zero FIR (registration irrespective of jurisdiction) codified; preliminary enquiry permitted for certain offence categories within statutory timelines.', 'published', 'dev-sample: well-known mapping'),
  ('22222222-2222-4222-8222-222222222215', '22222222-2222-4222-8222-222222222216', 'renumbered',
   'Admissibility of electronic records carried from IEA 65B → BSA 63 with drafting updates.', 'published', 'dev-sample: well-known mapping');
