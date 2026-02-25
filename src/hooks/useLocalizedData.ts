import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AlgorithmSet, Method, GlossaryTerm, Tip, LearningPath, Lube } from '@/types';

export function useLocalizedData() {
  const { t } = useTranslation('data');

  const localizeSet = useMemo(() => {
    return (set: AlgorithmSet): AlgorithmSet => ({
      ...set,
      description: t(`algorithmSets.${set.id}.description`, { defaultValue: set.description }),
    });
  }, [t]);

  const localizeMethod = useMemo(() => {
    return (method: Method): Method => ({
      ...method,
      description: t(`methods.${method.id}.description`, { defaultValue: method.description }),
      steps: method.steps.map((step, i) => ({
        ...step,
        name: t(`methods.${method.id}.steps.${i}.name`, { defaultValue: step.name }),
        description: t(`methods.${method.id}.steps.${i}.description`, { defaultValue: step.description }),
        tips: step.tips?.map((tip, j) =>
          t(`methods.${method.id}.steps.${i}.tips.${j}`, { defaultValue: tip })
        ),
      })),
      pros: method.pros.map((pro, i) =>
        t(`methods.${method.id}.pros.${i}`, { defaultValue: pro })
      ),
      cons: method.cons.map((con, i) =>
        t(`methods.${method.id}.cons.${i}`, { defaultValue: con })
      ),
    });
  }, [t]);

  const localizeGlossary = useMemo(() => {
    return (term: GlossaryTerm): GlossaryTerm => ({
      ...term,
      definition: t(`glossary.${term.id}.definition`, { defaultValue: term.definition }),
    });
  }, [t]);

  const localizeTip = useMemo(() => {
    return (tip: Tip): Tip => ({
      ...tip,
      title: t(`tips.${tip.id}.title`, { defaultValue: tip.title }),
      description: t(`tips.${tip.id}.description`, { defaultValue: tip.description }),
      content: t(`tips.${tip.id}.content`, { defaultValue: tip.content }),
      keyPoints: tip.keyPoints.map((point, i) =>
        t(`tips.${tip.id}.keyPoints.${i}`, { defaultValue: point })
      ),
    });
  }, [t]);

  const localizeLearningPath = useMemo(() => {
    return (path: LearningPath): LearningPath => ({
      ...path,
      description: t(`learningPaths.${path.id}.description`, { defaultValue: path.description }),
      milestones: path.milestones.map((milestone, i) => ({
        ...milestone,
        name: t(`learningPaths.${path.id}.milestones.${i}.name`, { defaultValue: milestone.name }),
        description: t(`learningPaths.${path.id}.milestones.${i}.description`, { defaultValue: milestone.description }),
        skills: milestone.skills.map((skill, j) =>
          t(`learningPaths.${path.id}.milestones.${i}.skills.${j}`, { defaultValue: skill })
        ),
      })),
    });
  }, [t]);

  const localizeLube = useMemo(() => {
    return (lube: Lube): Lube => ({
      ...lube,
      description: t(`lubes.${lube.id}.description`, { defaultValue: lube.description }),
      bestFor: lube.bestFor.map((b, i) =>
        t(`lubes.${lube.id}.bestFor.${i}`, { defaultValue: b })
      ),
    });
  }, [t]);

  return { localizeSet, localizeMethod, localizeGlossary, localizeTip, localizeLearningPath, localizeLube };
}
