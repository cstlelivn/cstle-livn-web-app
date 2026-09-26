-- Company planning default for common 55-75 inch televisions.
-- The approved client layout and actual VESA bracket still govern.

UPDATE public.task_templates tt
SET description = replace(
      replace(tt.description,
        'TV backing centred on the approved screen/bracket location (typical screen centre 42–48 in AFF)',
        'TV backing centred on the approved screen/bracket location (company default screen centre 54–60 in AFF for typical 55–75 in televisions)'
      ),
      'TV backing centred on the approved screen/bracket location (typical screen centre 60 in AFF)',
      'TV backing centred on the approved screen/bracket location (company default screen centre 54–60 in AFF for typical 55–75 in televisions)'
    ),
    updated_at = now()
FROM public.phase_templates ph
JOIN public.project_templates pt ON pt.id=ph.project_template_id
WHERE tt.phase_template_id=ph.id
  AND pt.name='Secondary Suite Development'
  AND pt.active=true
  AND tt.name='Install accessory and fixture backing to backing schedule';

UPDATE public.tasks t
SET description = replace(
      replace(t.description,
        'TV backing centred on the approved screen/bracket location (typical screen centre 42–48 in AFF)',
        'TV backing centred on the approved screen/bracket location (company default screen centre 54–60 in AFF for typical 55–75 in televisions)'
      ),
      'TV backing centred on the approved screen/bracket location (typical screen centre 60 in AFF)',
      'TV backing centred on the approved screen/bracket location (company default screen centre 54–60 in AFF for typical 55–75 in televisions)'
    ),
    updated_at = now()
FROM public.projects p
WHERE t.project_id=p.id
  AND lower(p.title) LIKE '%2992%trombley%'
  AND t.title='Install accessory and fixture backing to backing schedule';
