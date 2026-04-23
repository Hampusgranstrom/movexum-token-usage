-- ============================================================
-- Migration 0008: Quiz flow type + seed "entreprenor" and
-- "innovation" modules with scored option buckets and result
-- profiles. These are the two concrete Startupkompassen 2026
-- tools.
-- ============================================================

-- 1. Extend flow_type to include 'quiz' -----------------------
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_flow_type_check;
ALTER TABLE public.modules
  ADD CONSTRAINT modules_flow_type_check
  CHECK (flow_type IN ('wizard','chat','hybrid','quiz'));

-- 2. Result buckets on module (profiles shown after scoring) --
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS result_buckets jsonb NOT NULL DEFAULT '[]';

-- 3. Helper: RPC that tallies scores per bucket for a session -
--    Server computes the winning profile instead of trusting
--    client-side math.
CREATE OR REPLACE FUNCTION public.score_session(
  p_module_id uuid,
  p_session_id text
)
RETURNS TABLE (bucket_key text, score numeric) LANGUAGE sql STABLE AS $$
  SELECT
    opt_score.key AS bucket_key,
    SUM((opt_score.value)::numeric) AS score
  FROM public.question_responses qr
  JOIN public.questions q ON q.id = qr.question_id
  JOIN public.question_sets qs ON qs.id = q.question_set_id AND qs.module_id = p_module_id
  CROSS JOIN LATERAL jsonb_array_elements(q.options) AS opt
  CROSS JOIN LATERAL jsonb_each_text(COALESCE(opt -> 'scores', '{}'::jsonb)) AS opt_score
  WHERE qr.session_id = p_session_id
    AND qr.skipped = false
    AND qr.answer IS NOT NULL
    AND (opt ->> 'value') = (qr.answer #>> '{}')
  GROUP BY opt_score.key
  ORDER BY score DESC;
$$;

-- 4. Seed: Entreprenör quiz module ----------------------------
DO $$
DECLARE
  v_mod_id uuid;
  v_set_id uuid;
  v_q_id   uuid;
BEGIN
  -- skip if already seeded
  IF EXISTS (SELECT 1 FROM public.modules WHERE slug = 'entreprenor') THEN
    RETURN;
  END IF;

  INSERT INTO public.modules (
    slug, name, description, target_audience, flow_type,
    welcome_title, welcome_body, hero_eyebrow,
    consent_text, consent_version, lead_source_id,
    require_email, require_phone, is_active,
    result_buckets
  ) VALUES (
    'entreprenor',
    'Är du entreprenör?',
    'Självskattning av drivkrafter och förmågor för att bygga bolag.',
    'founders',
    'quiz',
    'Är du entreprenör?',
    'Ta reda på om du har drivkrafter och förmågor att bli entreprenör. Tar 2 minuter.',
    'Startupkompassen',
    'Dina svar hanteras anonymt om du inte själv väljer att lämna kontaktuppgifter i slutet. Ingen delas vidare. Läs mer i vår integritetspolicy.',
    1, 'web', false, false, true,
    jsonb_build_array(
      jsonb_build_object(
        'key', 'builder',
        'title', 'Builder',
        'description', 'Du har stark genomförandekraft och testar hellre än analyserar.',
        'tips', jsonb_build_array(
          'Börja testa idéer direkt — bygg en grov prototyp inom en vecka.',
          'Sök miljöer där du kan bygga snabbt och få feedback från andra entreprenörer.'
        ),
        'cta_label', 'Utforska din idé med Movexum',
        'cta_url', '/m/innovation'
      ),
      jsonb_build_object(
        'key', 'explorer',
        'title', 'Explorer',
        'description', 'Du har kreativitet och driv — men behöver struktur för att ta idéer i mål.',
        'tips', jsonb_build_array(
          'Jobba med tydliga delmål och deadlines.',
          'Ta hjälp av en strukturerad bollplank eller mentor.'
        ),
        'cta_label', 'Testa om din idé är redo',
        'cta_url', '/m/innovation'
      ),
      jsonb_build_object(
        'key', 'potential',
        'title', 'Potential (tidig fas)',
        'description', 'Du har intresse men behöver stärka vissa beteenden innan du hoppar in.',
        'tips', jsonb_build_array(
          'Träna på att slutföra saker du påbörjat.',
          'Utsätt dig för feedback regelbundet.'
        ),
        'cta_label', 'Kontakta Nyföretagarcentrum',
        'cta_url', 'https://nyforetagarcentrum.se'
      )
    )
  ) RETURNING id INTO v_mod_id;

  INSERT INTO public.question_sets (module_id, name)
  VALUES (v_mod_id, 'Default') RETURNING id INTO v_set_id;

  -- Helper: create question + control variant
  -- (Each option carries scores per bucket.)

  -- Q1
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'driver', 1, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Att lösa problem jag stör mig på','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Frihet och självständighet','scores',jsonb_build_object('explorer',1,'builder',1)),
    jsonb_build_object('value','C','label','Bygga något stort','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','D','label','Testa idéer och vara kreativ','scores',jsonb_build_object('explorer',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Vad driver dig mest?', 100, true);

  -- Q2
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'reaction', 2, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Jag testar en ny väg direkt','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Jag analyserar varför','scores',jsonb_build_object('explorer',2)),
    jsonb_build_object('value','C','label','Jag tappar energi','scores',jsonb_build_object('potential',2)),
    jsonb_build_object('value','D','label','Jag ber andra om hjälp','scores',jsonb_build_object('potential',1,'explorer',1))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur reagerar du när något inte funkar?', 100, true);

  -- Q3
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'uncertainty', 3, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Jag gillar det — det är spännande','scores',jsonb_build_object('builder',2,'explorer',1)),
    jsonb_build_object('value','B','label','Jag accepterar det','scores',jsonb_build_object('builder',1,'explorer',1)),
    jsonb_build_object('value','C','label','Jag blir stressad','scores',jsonb_build_object('potential',2)),
    jsonb_build_object('value','D','label','Jag undviker det','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur bekväm är du med osäkerhet?', 100, true);

  -- Q4
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'feedback', 4, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Jag söker aktivt feedback','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Jag tar till mig det mesta','scores',jsonb_build_object('explorer',2)),
    jsonb_build_object('value','C','label','Jag blir defensiv ibland','scores',jsonb_build_object('potential',1)),
    jsonb_build_object('value','D','label','Jag undviker det','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur hanterar du feedback?', 100, true);

  -- Q5
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'finisher', 5, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Nästan alltid','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Ofta','scores',jsonb_build_object('builder',1,'explorer',1)),
    jsonb_build_object('value','C','label','Ibland','scores',jsonb_build_object('potential',1,'explorer',1)),
    jsonb_build_object('value','D','label','Sällan','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur ofta slutför du det du påbörjar?', 100, true);

  -- Q6
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'rejection', 6, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ser det som en del av processen','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Försöker igen på annat sätt','scores',jsonb_build_object('builder',1,'explorer',1)),
    jsonb_build_object('value','C','label','Tappar motivation','scores',jsonb_build_object('potential',2)),
    jsonb_build_object('value','D','label','Undviker liknande situationer','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur reagerar du på ett "nej"?', 100, true);

  -- Q7
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'pivot', 7, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Jag pivotar gärna','scores',jsonb_build_object('explorer',2)),
    jsonb_build_object('value','B','label','Jag justerar om det behövs','scores',jsonb_build_object('builder',1,'explorer',1)),
    jsonb_build_object('value','C','label','Jag håller fast vid min vision','scores',jsonb_build_object('builder',1,'potential',1)),
    jsonb_build_object('value','D','label','Jag blir osäker','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur ser du på att ändra din idé?', 100, true);

  -- Q8
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'stress', 8, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Jag presterar bättre','scores',jsonb_build_object('builder',2)),
    jsonb_build_object('value','B','label','Jag håller ihop det','scores',jsonb_build_object('builder',1,'explorer',1)),
    jsonb_build_object('value','C','label','Jag blir ineffektiv','scores',jsonb_build_object('potential',2)),
    jsonb_build_object('value','D','label','Jag undviker situationen','scores',jsonb_build_object('potential',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur hanterar du stress?', 100, true);
END $$;

-- 5. Seed: Innovation quiz module -----------------------------
DO $$
DECLARE
  v_mod_id uuid;
  v_set_id uuid;
  v_q_id   uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.modules WHERE slug = 'innovation') THEN
    RETURN;
  END IF;

  INSERT INTO public.modules (
    slug, name, description, target_audience, flow_type,
    welcome_title, welcome_body, hero_eyebrow,
    consent_text, consent_version, lead_source_id,
    require_email, require_phone, is_active,
    result_buckets
  ) VALUES (
    'innovation',
    'Har din idé innovationspotential?',
    'Snabb validering av idéns potential: problem, kund, konkurrens, skalbarhet.',
    'founders',
    'quiz',
    'Har din idé innovationspotential?',
    'Sju frågor som hjälper dig se var din idé står — och vad nästa steg bör vara.',
    'Startupkompassen',
    'Dina svar hanteras anonymt om du inte själv väljer att lämna kontaktuppgifter i slutet. Ingen delas vidare. Läs mer i vår integritetspolicy.',
    1, 'web', false, false, true,
    jsonb_build_array(
      jsonb_build_object(
        'key', 'green',
        'title', 'Redo att testas',
        'description', 'Din idé har grundförutsättningar för att testas på riktigt. Det är dags att bygga en MVP och samla feedback.',
        'tips', jsonb_build_array(
          'Bygg en enkel MVP som löser kärnproblemet.',
          'Testa snabbt med 5–10 riktiga kunder.'
        ),
        'cta_label', 'Ansök till Movexum',
        'cta_url', '/m/founders'
      ),
      jsonb_build_object(
        'key', 'yellow',
        'title', 'Lovande men behöver valideras',
        'description', 'Idén har potential men behöver mer underlag innan du satsar stort.',
        'tips', jsonb_build_array(
          'Prata med minst 10 potentiella kunder.',
          'Kartlägg konkurrens och alternativ.'
        ),
        'cta_label', 'Få hjälp att validera',
        'cta_url', '/m/founders'
      ),
      jsonb_build_object(
        'key', 'red',
        'title', 'Tidigt stadium',
        'description', 'Idén är i ett tidigt läge — fokusera på att förtydliga problem och kund.',
        'tips', jsonb_build_array(
          'Skriv ner problemet i en mening.',
          'Definiera vilken kund som har problemet mest.'
        ),
        'cta_label', 'Börja med dig själv',
        'cta_url', '/m/entreprenor'
      )
    )
  ) RETURNING id INTO v_mod_id;

  INSERT INTO public.question_sets (module_id, name)
  VALUES (v_mod_id, 'Default') RETURNING id INTO v_set_id;

  -- Q1
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'problem', 1, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ett tydligt, konkret problem','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Ett problem jag själv upplever','scores',jsonb_build_object('yellow',1,'green',1)),
    jsonb_build_object('value','C','label','Något jag tror är ett problem','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','D','label','Osäker','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Vilket problem löser din idé?', 100, true);

  -- Q2
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'customer', 2, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Väldigt tydligt definierad','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Några möjliga grupper','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','C','label','Ganska brett','scores',jsonb_build_object('yellow',1,'red',1)),
    jsonb_build_object('value','D','label','Vet inte','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Vem är din kund?', 100, true);

  -- Q3
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'competition', 3, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ja, men min är bättre','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Ja, liknande','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','C','label','Osäker','scores',jsonb_build_object('red',1,'yellow',1)),
    jsonb_build_object('value','D','label','Har inte koll','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Finns det andra lösningar idag?', 100, true);

  -- Q4
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'customer_talk', 4, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ja, flera stycken','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Några','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','C','label','Tänkt göra det','scores',jsonb_build_object('red',1,'yellow',1)),
    jsonb_build_object('value','D','label','Nej','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Har du pratat med potentiella kunder?', 100, true);

  -- Q5
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'uniqueness', 5, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Tydligt annorlunda','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Något bättre','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','C','label','Liknande andra','scores',jsonb_build_object('red',1,'yellow',1)),
    jsonb_build_object('value','D','label','Vet inte','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Hur unik är din lösning?', 100, true);

  -- Q6
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'scalability', 6, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ja, lätt','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Möjligt','scores',jsonb_build_object('yellow',1,'green',1)),
    jsonb_build_object('value','C','label','Svårt','scores',jsonb_build_object('red',1,'yellow',1)),
    jsonb_build_object('value','D','label','Har inte tänkt på det','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Går det att skala idén?', 100, true);

  -- Q7
  INSERT INTO public.questions (question_set_id, key, display_order, type, required, options)
  VALUES (v_set_id, 'tested', 7, 'single_choice', true, jsonb_build_array(
    jsonb_build_object('value','A','label','Ja','scores',jsonb_build_object('green',2)),
    jsonb_build_object('value','B','label','Delvis','scores',jsonb_build_object('yellow',2)),
    jsonb_build_object('value','C','label','Planerar','scores',jsonb_build_object('yellow',1,'red',1)),
    jsonb_build_object('value','D','label','Nej','scores',jsonb_build_object('red',2))
  )) RETURNING id INTO v_q_id;
  INSERT INTO public.question_variants (question_id, label, text, weight, is_control)
  VALUES (v_q_id, 'control', 'Har du testat idén i liten skala?', 100, true);
END $$;
