import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { JournalStatsCards } from './JournalStatsCards'
import { JournalTopGames } from './JournalTopGames'
import { JournalGenres } from './JournalGenres'
import { JournalHighlights } from './JournalHighlights'

interface TopGame { name: string; hours: number; percentOfTotal: number; appId: number; }
interface GenreDistribution { genre: string; percent: number; }
interface ReportHighlight { type: string; title: string; value: string; details?: string; }
export interface MonthlyReport {
  title: string;
  stats: { hoursPlayed: number; gamesPlayed: number; achievementsUnlocked: number; newGamesAdded: number; gamemindScoreDelta: number | null; };
  summary: string;
  topGames: TopGame[];
  genresCurrent: GenreDistribution[];
  highlights: ReportHighlight[];
  isLowActivity: boolean;
}

interface Props {
  report: MonthlyReport
}

export const JournalReport = ({ report }: Props) => {
  const { t } = useTranslation()

  return (
    <motion.div 
      className="journal-report"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={report.title}
    >
      <div className="report-header">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          {report.title}
        </motion.h1>
        
        {report.isLowActivity ? (
          <motion.div 
            className="low-activity-notice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('journal.low_activity_msg')}
          </motion.div>
        ) : (
          <motion.p 
            className="report-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {report.summary}
          </motion.p>
        )}
      </div>

      {!report.isLowActivity && (
        <div className="report-body">
          <JournalStatsCards stats={report.stats} />
          
          <div className="report-columns" style={{ gridTemplateColumns: report.genresCurrent?.length > 0 ? '2fr 1fr' : '1fr' }}>
            <div className="report-col-main" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <JournalTopGames games={report.topGames} />
              <JournalHighlights highlights={report.highlights} />
            </div>
            {report.genresCurrent?.length > 0 && (
              <div className="report-col-side">
                <JournalGenres genres={report.genresCurrent} />
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
